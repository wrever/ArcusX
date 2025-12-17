<?php
/**
 * config.php
 * - Carga configuración desde variables de entorno (recomendado).
 * - NO envía headers CORS (eso lo maneja security_headers.php o el servidor).
 */

// DB
$db_config = [
  'host' => getenv('ARCUSX_DB_HOST') ?: 'localhost',
  'user' => getenv('ARCUSX_DB_USER') ?: '',
  'password' => getenv('ARCUSX_DB_PASS') ?: '',
  'database' => getenv('ARCUSX_DB_NAME') ?: ''
];

define('DB_HOST', $db_config['host']);
define('DB_USER', $db_config['user']);
define('DB_PASS', $db_config['password']);
define('DB_NAME', $db_config['database']);

$conn = new mysqli($db_config['host'], $db_config['user'], $db_config['password'], $db_config['database']);
if ($conn->connect_error) {
  // No hacer echo aquí; los endpoints deben capturar y responder JSON.
  throw new Exception('Error de conexión a la base de datos: ' . $conn->connect_error);
}

// JWT secret
$jwt_secret = getenv('ARCUSX_JWT_SECRET') ?: '';
if (!$jwt_secret) {
  // En DEV permitimos seguir, pero en producción esto debería ser obligatorio.
  if (getenv('ARCUSX_ENV') === 'production') {
    throw new Exception('ARCUSX_JWT_SECRET no está configurado');
  }
  // fallback inseguro SOLO para dev local
  $jwt_secret = 'dev-insecure-secret-change-me';
}
?>
