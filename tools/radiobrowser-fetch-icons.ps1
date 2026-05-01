param(
  [int] $MaxStations = 500,
  [int] $DelayMs = 150,
  [switch] $RetryNone,
  [switch] $ClearCache
)

$ErrorActionPreference = "Stop"

$RadioLstPath = Join-Path $PSScriptRoot "..\\rlist\\radio.lst"
$IconDir = Join-Path $PSScriptRoot "..\\icon"
$CachePath = Join-Path $IconDir "radiobrowser-cache.json"

function Normalize-StationName([string] $name) {
  $n = ($name ?? "").Trim()
  $n = [regex]::Replace($n, "\s+", " ")
  return $n.ToUpperInvariant()
}

function Safe-FileName([string] $name, [string] $ext) {
  $n = ($name ?? "").Trim().ToLowerInvariant()
  $n = [regex]::Replace($n, "\s+", "_")
  $n = $n -replace '[\\/:*?"<>|]', "_"
  $n = $n -replace "[^\p{L}\p{Nd}_\.-]", "_"
  $n = $n.Trim("_", ".", " ")
  if ([string]::IsNullOrWhiteSpace($n)) { $n = "icon" }
  if (-not $ext.StartsWith(".")) { $ext = "." + $ext }
  return "$n$ext"
}

function Download-WithRetry([string] $uri, [string] $outPath) {
  $tmp = $outPath + ".download"
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }

  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      Invoke-WebRequest -UseBasicParsing -Headers @{ "User-Agent" = "WebRadioStation/1.0" } -Uri $uri -OutFile $tmp
      Move-Item -LiteralPath $tmp -Destination $outPath -Force
      return
    } catch {
      if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
      if ($attempt -eq 5) { throw }
      Start-Sleep -Milliseconds (250 * $attempt)
    }
  }
}

function Load-Cache() {
  if (-not (Test-Path -LiteralPath $CachePath)) { return @{} }
  try {
    $raw = Get-Content -LiteralPath $CachePath -Encoding UTF8 -Raw
    $obj = $raw | ConvertFrom-Json -AsHashtable
    if ($obj -is [hashtable]) { return $obj }
    return @{}
  } catch {
    return @{}
  }
}

function Save-Cache([hashtable] $cache) {
  $cache | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $CachePath -Encoding UTF8
}

function Get-RadioBrowserBaseUrl() {
  # Try to use the official "servers" list; fallback to a known mirror.
  try {
    $servers = Invoke-RestMethod -Headers @{ "User-Agent" = "WebRadioStation/1.0" } -Uri "https://api.radio-browser.info/json/servers" -Method GET
    if ($servers -and $servers.Count -gt 0 -and $servers[0].name) {
      return "https://$($servers[0].name)/json"
    }
  } catch {
    # ignore
  }
  return "https://de1.api.radio-browser.info/json"
}

function Is-AcceptableFavicon([string] $faviconUrl) {
  if ([string]::IsNullOrWhiteSpace($faviconUrl)) { return $false }
  if ($faviconUrl.StartsWith("data:", [System.StringComparison]::OrdinalIgnoreCase)) { return $false }

  try { $u = [uri]$faviconUrl } catch { return $false }
  if ($u.Scheme -ne "http" -and $u.Scheme -ne "https") { return $false }

  $hostname = ($u.Host ?? "").ToLowerInvariant()
  # Avoid Google image caches / app store hosted images (often not a station's own icon and licensing unclear)
  if ($hostname -like "*gstatic.com" -or $hostname -like "*googleusercontent.com") { return $false }

  $path = ($u.AbsolutePath ?? "").ToLowerInvariant()
  if ($path -match "favicon" -or $path -match "apple-touch-icon") { return $true }
  if ($path -match "\.(ico|png|jpg|jpeg|svg|webp)$") { return $true }
  return $false
}

function Find-IconForStation([string] $stationName, [string] $baseUrl) {
  $q = [uri]::EscapeDataString($stationName)
  $url = "$baseUrl/stations/byname/$q"
  try {
    $items = Invoke-RestMethod -Headers @{ "User-Agent" = "WebRadioStation/1.0" } -Uri $url -Method GET
  } catch {
    return $null
  }
  if (-not $items) { return $null }

  # Pick highest-vote entry that has a favicon
  $best = $items |
    Where-Object { $_.favicon -and (Is-AcceptableFavicon $_.favicon.ToString()) } |
    Sort-Object -Property @{ Expression = { [int]($_.votes ?? 0) }; Descending = $true }, @{ Expression = { [int]($_.clickcount ?? 0) }; Descending = $true } |
    Select-Object -First 1

  if (-not $best) { return $null }
  return $best.favicon.ToString().Trim()
}

if (-not (Test-Path -LiteralPath $RadioLstPath)) {
  throw "radio.lst not found: $RadioLstPath"
}

New-Item -ItemType Directory -Force -Path $IconDir | Out-Null

$baseUrl = Get-RadioBrowserBaseUrl
Write-Host "Radio-Browser base: $baseUrl"

$cache = Load-Cache
if (-not $cache.ContainsKey("byName")) { $cache["byName"] = @{} }
$byNameCache = $cache["byName"]

if ($ClearCache) {
  Write-Host "Clearing cache: $CachePath"
  $byNameCache = @{}
  $cache["byName"] = $byNameCache
}

$lines = Get-Content -LiteralPath $RadioLstPath -Encoding UTF8

# Station names that exist in radio.lst (defensive guard: never download anything else)
$stationsInList = New-Object System.Collections.Generic.HashSet[string]
for ($i = 0; $i -lt $lines.Count; $i++) {
  $raw = $lines[$i]
  $trim = $raw.Trim()
  if ($trim.Length -eq 0 -or $trim.StartsWith("#") -or $trim.StartsWith("//")) { continue }
  $eq = $raw.IndexOf("=")
  if ($eq -le 0) { continue }
  $name = $raw.Substring(0, $eq).Trim()
  if ([string]::IsNullOrWhiteSpace($name)) { continue }
  $null = $stationsInList.Add((Normalize-StationName $name))
}

# Group lines without icon by station name
$need = @{}
for ($i = 0; $i -lt $lines.Count; $i++) {
  $raw = $lines[$i]
  $trim = $raw.Trim()
  if ($trim.Length -eq 0 -or $trim.StartsWith("#") -or $trim.StartsWith("//")) { continue }
  $eq = $raw.IndexOf("=")
  if ($eq -le 0) { continue }
  $rhs = $raw.Substring($eq + 1)
  if ($rhs -match "\|") { continue }
  $name = $raw.Substring(0, $eq).Trim()
  if ([string]::IsNullOrWhiteSpace($name)) { continue }
  $key = Normalize-StationName $name
  if (-not $stationsInList.Contains($key)) { continue }
  if (-not $need.ContainsKey($key)) { $need[$key] = [System.Collections.Generic.List[int]]::new() }
  $need[$key].Add([int]$i)
}

$stationKeys = $need.Keys | Sort-Object
Write-Host "Stations without icons (unique): $($stationKeys.Count)"

$processed = 0
$updatedLines = 0
foreach ($k in $stationKeys) {
  if ($processed -ge $MaxStations) { break }
  $processed++

  $sampleLine = $lines[$need[$k][0]]
  $eq = $sampleLine.IndexOf("=")
  $stationName = $sampleLine.Substring(0, $eq).Trim()

  if ($byNameCache.ContainsKey($k) -and $byNameCache[$k]) {
    $iconRel = $byNameCache[$k].ToString()
    if ($iconRel -ne "__NONE__") {
      foreach ($idx in $need[$k]) {
        $lines[$idx] = $lines[$idx] + " | " + $iconRel
        $updatedLines++
      }
      continue
    }
    if (-not $RetryNone) {
      continue
    }
    # Retry previously-not-found entries when -RetryNone is used
    $null = $byNameCache.Remove($k)
  }

  Write-Host "[$processed/$($stationKeys.Count)] Query: $stationName"
  $fav = Find-IconForStation -stationName $stationName -baseUrl $baseUrl
  if (-not $fav) {
    $byNameCache[$k] = "__NONE__"
    Start-Sleep -Milliseconds $DelayMs
    continue
  }

  $favNoQuery = ($fav -split "\?")[0]
  $ext = [System.IO.Path]::GetExtension($favNoQuery)
  if ([string]::IsNullOrWhiteSpace($ext)) { $ext = ".png" }
  if ($ext.Length -gt 6) { $ext = ".png" }

  $fileName = Safe-FileName $stationName $ext
  $outPath = Join-Path $IconDir $fileName
  $rel = "icon/$fileName"

  if (-not (Test-Path -LiteralPath $outPath)) {
    try {
      Write-Host "  Download: $fav -> $rel"
      Download-WithRetry -uri $fav -outPath $outPath
    } catch {
      Write-Host "  Download failed: $($_.Exception.Message)"
      $byNameCache[$k] = "__NONE__"
      Start-Sleep -Milliseconds $DelayMs
      continue
    }
  }

  $byNameCache[$k] = $rel
  foreach ($idx in $need[$k]) {
    $lines[$idx] = $lines[$idx] + " | " + $rel
    $updatedLines++
  }

  Start-Sleep -Milliseconds $DelayMs
}

$cache["byName"] = $byNameCache
Save-Cache -cache $cache

if ($updatedLines -gt 0) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $bak = "$RadioLstPath.bak-$stamp"
  Copy-Item -LiteralPath $RadioLstPath -Destination $bak -Force
  $lines | Set-Content -LiteralPath $RadioLstPath -Encoding UTF8
  Write-Host "Updated radio.lst lines: $updatedLines"
  Write-Host "Backup written: $bak"
} else {
  Write-Host "No radio.lst changes."
}
