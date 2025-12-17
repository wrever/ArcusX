<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/rate_limit.php';
require_once __DIR__ . '/lib/require_autoload.php';
require_once __DIR__ . '/config.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'message' => 'Método no permitido']);
  exit;
}

$debug = getenv('ARCUSX_DEBUG') === '1';
error_reporting($debug ? E_ALL : 0);
ini_set('display_errors', $debug ? '1' : '0');
ini_set('log_errors', '1');

// Rate limit: 10 intentos por 5 minutos por IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
arcusx_rate_limit('login_' . $ip, 10, 300);

try {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);

  if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
  }

  if (!isset($data['email'], $data['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan email o password']);
    exit;
  }

  $email = trim((string)$data['email']);
  $password = (string)$data['password'];

  $stmt = $conn->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
  if (!$stmt) throw new Exception('Error interno (prepare)');
  $stmt->bind_param("s", $email);
  $stmt->execute();
  $result = $stmt->get_result();
  $user = $result ? $result->fetch_assoc() : null;
  $stmt->close();

  if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Credenciales inválidas']);
    exit;
  }

  $issuedAt = time();
  $expire = $issuedAt + (int)(getenv('ARCUSX_JWT_TTL') ?: 86400); // 24h default

  $payload = [
    'iat' => $issuedAt,
    'exp' => $expire,
    'data' => [
      'id' => (int)$user['id'],
      'username' => $user['username'],
      'email' => $user['email']
    ]
  ];

  $jwt = JWT::encode($payload, $jwt_secret, 'HS256');

  echo json_encode([
    'success' => true,
    'token' => $jwt,
    'user' => [
      'id' => (int)$user['id'],
      'username' => $user['username'],
      'email' => $user['email']
    ]
  ]);
} catch (Exception $e) {
  http_response_code(500);
  $msg = $debug ? $e->getMessage() : 'Error interno del servidor';
  echo json_encode(['success' => false, 'message' => $msg]);
}
