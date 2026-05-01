<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
  exit;
}

$raw = file_get_contents('php://input');
if ($raw === false) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'No body']);
  exit;
}

$data = json_decode($raw, true);
if (!is_array($data) || !isset($data['content']) || !is_string($data['content'])) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
  exit;
}

$content = $data['content'];
// safety: limit size (~2MB)
if (strlen($content) > 2_000_000) {
  http_response_code(413);
  echo json_encode(['ok' => false, 'error' => 'Content too large']);
  exit;
}

$targetDir = realpath(__DIR__ . '/../rlist');
if ($targetDir === false) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Target directory missing']);
  exit;
}

$targetFile = $targetDir . DIRECTORY_SEPARATOR . 'radio.lst';

// backup existing file (best-effort)
if (file_exists($targetFile)) {
  $stamp = date('Ymd-His');
  $backup = $targetDir . DIRECTORY_SEPARATOR . "radio.lst.bak-$stamp";
  @copy($targetFile, $backup);
}

$bytes = @file_put_contents($targetFile, $content, LOCK_EX);
if ($bytes === false) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Write failed']);
  exit;
}

echo json_encode(['ok' => true, 'bytes' => $bytes, 'file' => 'rlist/radio.lst']);

