<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/rate_limit.php';
require_once __DIR__ . '/lib/require_autoload.php';
require_once __DIR__ . '/config.php';

use Firebase\JWT\JWT;

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método no permitido']);
  exit;
}

$debug = getenv('ARCUSX_DEBUG') === '1';
error_reporting($debug ? E_ALL : 0);
ini_set('display_errors', $debug ? '1' : '0');
ini_set('log_errors', '1');

// Rate limit: 5 registros por 10 minutos por IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
arcusx_rate_limit('register_' . $ip, 5, 600);

try {
  $data = json_decode(file_get_contents('php://input'), true);
  if (!is_array($data)) {
    http_response_code(400); echo json_encode(['success'=>false,'message'=>'JSON inválido']); exit;
  }

  $username = trim((string)($data['username'] ?? ''));
  $email = trim((string)($data['email'] ?? ''));
  $password = (string)($data['password'] ?? '');

  if ($username === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Faltan campos obligatorios']);
    exit;
  }
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Email inválido']);
    exit;
  }
  if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Password debe tener al menos 8 caracteres']);
    exit;
  }

  // Verificar duplicados
  $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1");
  if (!$stmt) throw new Exception('Error interno (prepare)');
  $stmt->bind_param("ss", $email, $username);
  $stmt->execute();
  $res = $stmt->get_result();
  $exists = $res && $res->num_rows > 0;
  $stmt->close();

  if ($exists) {
    http_response_code(409);
    echo json_encode(['success'=>false,'message'=>'Usuario o email ya existe']);
    exit;
  }

  $hash = password_hash($password, PASSWORD_DEFAULT);

  $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
  if (!$stmt) throw new Exception('Error interno (prepare insert)');
  $stmt->bind_param("sss", $username, $email, $hash);
  $ok = $stmt->execute();
  $userId = $stmt->insert_id;
  $stmt->close();

  if (!$ok) throw new Exception('No se pudo crear el usuario');

  // JWT
  $issuedAt = time();
  $expire = $issuedAt + (int)(getenv('ARCUSX_JWT_TTL') ?: 86400);
  $payload = [
    'iat' => $issuedAt,
    'exp' => $expire,
    'data' => ['id' => (int)$userId, 'username' => $username, 'email' => $email]
  ];
  $jwt = JWT::encode($payload, $jwt_secret, 'HS256');

  echo json_encode(['success'=>true,'token'=>$jwt,'user'=>['id'=>(int)$userId,'username'=>$username,'email'=>$email]]);
} catch (Exception $e) {
  http_response_code(500);
  $msg = $debug ? $e->getMessage() : 'Error interno del servidor';
  echo json_encode(['success'=>false,'message'=>$msg]);
}
