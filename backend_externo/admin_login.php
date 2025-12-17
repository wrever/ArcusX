<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/rate_limit.php';
require_once __DIR__ . '/lib/require_autoload.php';
require_once __DIR__ . '/config.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

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

// Rate limit: 10 intentos por 5 minutos por IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
arcusx_rate_limit('admin_login_' . $ip, 10, 300);

try {
  $data = json_decode(file_get_contents('php://input'), true);
  if (!is_array($data)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'JSON inválido']); exit; }

  $email = trim((string)($data['email'] ?? ''));
  $password = (string)($data['password'] ?? '');

  if ($email === '' || $password === '') { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Faltan email o password']); exit; }

  // Admin por configuración o tabla users con rol admin.
  $adminEmail = getenv('ARCUSX_ADMIN_EMAIL') ?: '';
  $adminPassHash = getenv('ARCUSX_ADMIN_PASS_HASH') ?: '';

  $isAdmin = false;
  $adminId = null;

  if ($adminEmail && $adminPassHash && strtolower($email) === strtolower($adminEmail) && password_verify($password, $adminPassHash)) {
    $isAdmin = true;
    $adminId = 0;
  } else {
    // fallback: buscar en DB si existe columna role
    $stmt = $conn->prepare("SELECT id, username, email, password, role FROM users WHERE email = ? LIMIT 1");
    if ($stmt) {
      $stmt->bind_param("s", $email);
      $stmt->execute();
      $res = $stmt->get_result();
      $u = $res ? $res->fetch_assoc() : null;
      $stmt->close();
      if ($u && isset($u['role']) && ($u['role'] === 'admin' || $u['role'] === 'ADMIN') && password_verify($password, $u['password'])) {
        $isAdmin = true;
        $adminId = (int)$u['id'];
      }
    }
  }

  if (!$isAdmin) {
    http_response_code(401);
    echo json_encode(['success'=>false,'message'=>'Credenciales inválidas']);
    exit;
  }

  $issuedAt = time();
  $expire = $issuedAt + (int)(getenv('ARCUSX_ADMIN_JWT_TTL') ?: 86400);

  $payload = [
    'iat' => $issuedAt,
    'exp' => $expire,
    'data' => [
      'id' => $adminId,
      'role' => 'admin',
      'email' => $email
    ]
  ];

  $jwt = JWT::encode($payload, $jwt_secret, 'HS256');

  echo json_encode(['success'=>true,'token'=>$jwt,'admin'=>['id'=>$adminId,'email'=>$email]]);
} catch (Exception $e) {
  http_response_code(500);
  $msg = $debug ? $e->getMessage() : 'Error interno del servidor';
  echo json_encode(['success'=>false,'message'=>$msg]);
}
