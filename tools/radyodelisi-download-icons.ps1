$ErrorActionPreference = "Stop"

$SourceUrl = "https://radyodelisi.blogspot.com/2014/07/radyo-kanallari.html"
$IconDir = Join-Path $PSScriptRoot "..\\icon"
$RadioLstPath = Join-Path $PSScriptRoot "..\\rlist\\radio.lst"

function Normalize-StationName([string] $name) {
  $n = ($name ?? "").Trim()
  $n = [regex]::Replace($n, "\s+", " ")
  return $n.ToUpperInvariant()
}

function Safe-FileName([string] $name, [string] $ext) {
  $n = ($name ?? "").Trim().ToLowerInvariant()
  $n = [regex]::Replace($n, "\s+", "_")
  # replace invalid filename characters
  $n = $n -replace '[\\/:*?"<>|]', "_"
  $n = $n -replace "[^\p{L}\p{Nd}_\.-]", "_"
  $n = $n.Trim("_", ".", " ")
  if ([string]::IsNullOrWhiteSpace($n)) { $n = "icon" }
  if (-not $ext.StartsWith(".")) { $ext = "." + $ext }
  return "$n$ext"
}

New-Item -ItemType Directory -Force -Path $IconDir | Out-Null

function Download-WithRetry([string] $uri, [string] $outPath) {
  $tmp = $outPath + ".download"
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }

  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $tmp
      Move-Item -LiteralPath $tmp -Destination $outPath -Force
      return
    } catch {
      if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
      if ($attempt -eq 5) { throw }
      Start-Sleep -Milliseconds (250 * $attempt)
    }
  }
}

Write-Host "Fetching HTML: $SourceUrl"
$html = (Invoke-WebRequest -UseBasicParsing -Uri $SourceUrl).Content

$re = [regex]'(?is)<img[^>]*?\balt="(?<alt>[^"]+)"[^>]*?\bsrc="(?<src>[^"]+)"'
$matches = $re.Matches($html)
Write-Host "Found images: $($matches.Count)"

# Build map alt->src (dedupe by normalized alt)
$byName = @{}
foreach ($m in $matches) {
  $alt = $m.Groups["alt"].Value
  $src = $m.Groups["src"].Value
  if ([string]::IsNullOrWhiteSpace($alt) -or [string]::IsNullOrWhiteSpace($src)) { continue }
  $k = Normalize-StationName $alt
  if (-not $byName.ContainsKey($k)) {
    $byName[$k] = [pscustomobject]@{ alt = $alt.Trim(); src = $src.Trim() }
  }
}

Write-Host "Unique stations with icons: $($byName.Count)"

# Download
$usedNames = @{}
$mapOut = @{}
$i = 0
foreach ($k in $byName.Keys | Sort-Object) {
  $i++
  $alt = $byName[$k].alt
  $src = $byName[$k].src

  $srcNoQuery = ($src -split "\?")[0]
  $ext = [System.IO.Path]::GetExtension($srcNoQuery)
  if ([string]::IsNullOrWhiteSpace($ext)) { $ext = ".jpg" }

  $baseName = Safe-FileName $alt $ext
  $fileName = $baseName
  $n = 2
  while ($usedNames.ContainsKey($fileName)) {
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($baseName) + "-$n" + [System.IO.Path]::GetExtension($baseName)
    $n++
  }
  $usedNames[$fileName] = $true

  $outPath = Join-Path $IconDir $fileName
  $rel = "icon/$fileName"

  if (-not (Test-Path -LiteralPath $outPath)) {
    Write-Host "[$i/$($byName.Count)] Download: $alt -> $rel"
    Download-WithRetry -uri $src -outPath $outPath
  }

  $mapOut[$alt] = $rel
}

$mapJsonPath = Join-Path $IconDir "radyodelisi-map.json"
$mapOut | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath $mapJsonPath
Write-Host "Wrote map: $mapJsonPath"

# Update radio.lst (append icon path if station name matches and line has no icon yet)
if (Test-Path -LiteralPath $RadioLstPath) {
  Write-Host "Updating: $RadioLstPath"
  $radioLines = Get-Content -LiteralPath $RadioLstPath -Encoding UTF8

  # Build normalized lookup from mapOut (alt text -> rel)
  $iconByNorm = @{}
  foreach ($alt in $mapOut.Keys) {
    $norm = Normalize-StationName $alt
    if (-not $iconByNorm.ContainsKey($norm)) { $iconByNorm[$norm] = $mapOut[$alt] }
  }

  $updated = New-Object System.Collections.Generic.List[string]
  $added = 0
  foreach ($lineRaw in $radioLines) {
    $line = $lineRaw
    $trim = $line.Trim()
    if ($trim.Length -eq 0 -or $trim.StartsWith("#") -or $trim.StartsWith("//")) {
      $updated.Add($line)
      continue
    }
    $eq = $line.IndexOf("=")
    if ($eq -le 0) {
      $updated.Add($line)
      continue
    }
    $name = $line.Substring(0, $eq).Trim()
    $rhs = $line.Substring($eq + 1).Trim()
    if ($rhs -match "\|") {
      $updated.Add($line)
      continue
    }
    $norm = Normalize-StationName $name
    if ($iconByNorm.ContainsKey($norm)) {
      $iconRel = $iconByNorm[$norm]
      $updated.Add("$name = $rhs | $iconRel")
      $added++
    } else {
      $updated.Add($line)
    }
  }

  if ($added -gt 0) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $bak = "$RadioLstPath.bak-$stamp"
    Copy-Item -LiteralPath $RadioLstPath -Destination $bak -Force
    $updated | Set-Content -LiteralPath $RadioLstPath -Encoding UTF8
    Write-Host "Updated lines with icons: $added"
    Write-Host "Backup written: $bak"
  } else {
    Write-Host "No matching station names found in radio.lst (no changes)."
  }
} else {
  Write-Host "radio.lst not found at: $RadioLstPath"
}
