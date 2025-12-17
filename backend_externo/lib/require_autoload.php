<?php
/**
 * require_autoload.php
 * Intenta cargar composer autoload desde ubicaciones comunes.
 */
$paths = [
  __DIR__ . '/vendor/autoload.php',
  __DIR__ . '/../vendor/autoload.php',
  __DIR__ . '/../../vendor/autoload.php'
];

$loaded = false;
foreach ($paths as $p) {
  if (file_exists($p)) {
    require_once $p;
    $loaded = true;
    break;
  }
}

if (!$loaded) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode([
    'success' => false,
    'message' => 'Dependencias no encontradas (Composer autoload).',
    'details' => 'No se encontró vendor/autoload.php en rutas esperadas. Ejecuta composer install o incluye la carpeta vendor.'
  ]);
  exit;
}
