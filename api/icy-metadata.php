<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $code, array $payload): void {
  http_response_code($code);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function is_private_ip(string $ip): bool {
  if (!filter_var($ip, FILTER_VALIDATE_IP)) return true;
  $flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
  return filter_var($ip, FILTER_VALIDATE_IP, $flags) === false;
}

function validate_url(string $url): array {
  $url = trim($url);
  if ($url === '' || strlen($url) > 2048) return [false, 'Invalid url'];
  $parts = parse_url($url);
  if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) return [false, 'Invalid url'];
  $scheme = strtolower((string)$parts['scheme']);
  if ($scheme !== 'http' && $scheme !== 'https') return [false, 'Only http/https allowed'];

  $host = strtolower((string)$parts['host']);
  if ($host === 'localhost' || $host === '127.0.0.1' || $host === '::1' || str_ends_with($host, '.local')) {
    return [false, 'Blocked host'];
  }

  // Basic SSRF protection: resolve to an IP and block private/reserved ranges.
  $ip = gethostbyname($host);
  if ($ip === $host) return [false, 'DNS resolution failed'];
  if (is_private_ip($ip)) return [false, 'Blocked IP range'];

  return [true, $url];
}

$raw = file_get_contents('php://input');
$url = '';
if (is_string($raw) && trim($raw) !== '') {
  $data = json_decode($raw, true);
  if (is_array($data) && isset($data['url']) && is_string($data['url'])) $url = $data['url'];
}
if ($url === '' && isset($_GET['url']) && is_string($_GET['url'])) $url = $_GET['url'];

[$ok, $validated] = validate_url($url);
if (!$ok) respond(400, ['ok' => false, 'error' => $validated]);
$url = $validated;

$maxBytes = 512 * 1024; // stop reading after 512KB
$timeout = 6;

$headers = [];
$metaint = null;
$audioBytes = 0;
$metaLen = null;
$metaBuf = '';
$streamTitle = null;

$ch = curl_init();
curl_setopt_array($ch, [
  CURLOPT_URL => $url,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_MAXREDIRS => 5,
  CURLOPT_RETURNTRANSFER => false,
  CURLOPT_HEADER => false,
  CURLOPT_NOBODY => false,
  CURLOPT_CONNECTTIMEOUT => $timeout,
  CURLOPT_TIMEOUT => $timeout,
  CURLOPT_USERAGENT => 'WebRadioStation/1.0',
  CURLOPT_HTTPHEADER => ['Icy-MetaData: 1', 'Accept: */*'],
  CURLOPT_HEADERFUNCTION => function ($ch, string $line) use (&$headers, &$metaint) {
    $lineTrim = trim($line);
    if ($lineTrim === '') return strlen($line);
    $pos = strpos($lineTrim, ':');
    if ($pos !== false) {
      $k = strtolower(trim(substr($lineTrim, 0, $pos)));
      $v = trim(substr($lineTrim, $pos + 1));
      $headers[$k] = $v;
      if ($k === 'icy-metaint') $metaint = (int)$v;
    }
    return strlen($line);
  },
  CURLOPT_WRITEFUNCTION => function ($ch, string $chunk) use (&$metaint, &$audioBytes, &$metaLen, &$metaBuf, &$streamTitle, $maxBytes) {
    if ($streamTitle !== null) return 0; // stop
    if ($metaint === null || $metaint <= 0) {
      // no ICY metadata advertised; keep a small amount then stop
      $audioBytes += strlen($chunk);
      return ($audioBytes >= 32 * 1024) ? 0 : strlen($chunk);
    }

    $i = 0;
    $n = strlen($chunk);
    while ($i < $n) {
      if ($streamTitle !== null) return 0;

      if ($metaLen === null) {
        // Consume audio bytes until metaint reached
        $need = $metaint - ($audioBytes % $metaint);
        $take = min($need, $n - $i);
        $audioBytes += $take;
        $i += $take;

        if (($audioBytes % $metaint) === 0) {
          // Next byte is metadata length
          if ($i >= $n) break;
          $metaLen = ord($chunk[$i]) * 16;
          $i += 1;
          if ($metaLen === 0) {
            $metaLen = null; // no metadata this block, continue
          } else {
            $metaBuf = '';
          }
        }
      } else {
        $take = min($metaLen - strlen($metaBuf), $n - $i);
        $metaBuf .= substr($chunk, $i, $take);
        $i += $take;

        if (strlen($metaBuf) >= $metaLen) {
          // Parse metadata
          $meta = trim($metaBuf, "\0 \t\r\n");
          $metaLen = null;
          $metaBuf = '';
          if ($meta !== '') {
            if (preg_match("/StreamTitle='([^']*)';/i", $meta, $m)) {
              $title = trim($m[1]);
              if ($title !== '') $streamTitle = $title;
            }
          }
        }
      }
      if ($audioBytes >= $maxBytes) return 0;
    }

    return strlen($chunk);
  },
]);

$execOk = curl_exec($ch);
$curlErr = curl_error($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if ($execOk === false) respond(502, ['ok' => false, 'error' => $curlErr ?: 'curl error']);
if ($httpCode < 200 || $httpCode >= 400) respond(502, ['ok' => false, 'error' => "HTTP $httpCode"]);

if ($metaint === null || $metaint <= 0) {
  respond(200, ['ok' => true, 'supported' => false, 'streamTitle' => null, 'note' => 'No icy-metaint header']);
}

respond(200, [
  'ok' => true,
  'supported' => true,
  'streamTitle' => $streamTitle,
  'metaint' => $metaint,
]);

