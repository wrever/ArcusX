<?php
/**
 * rate_limit.php
 * Rate limiting muy simple basado en archivos en /tmp (sin dependencias).
 * Útil para proteger login/registro.
 */

function arcusx_rate_limit(string $key, int $maxRequests, int $windowSeconds): void {
  $safeKey = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $key);
  $path = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "arcusx_rl_" . $safeKey . ".json";

  $now = time();
  $data = ['start' => $now, 'count' => 0];

  if (file_exists($path)) {
    $raw = file_get_contents($path);
    $parsed = json_decode($raw, true);
    if (is_array($parsed) && isset($parsed['start'], $parsed['count'])) {
      $data = $parsed;
    }
  }

  // Reset window
  if ($now - (int)$data['start'] >= $windowSeconds) {
    $data = ['start' => $now, 'count' => 0];
  }

  $data['count'] = (int)$data['count'] + 1;
  file_put_contents($path, json_encode($data));

  if ($data['count'] > $maxRequests) {
    http_response_code(429);
    header('Content-Type: application/json');
    echo json_encode([
      'success' => false,
      'message' => 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    ]);
    exit;
  }
}
