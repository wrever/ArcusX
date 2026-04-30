<?php
/**
 * admin_login.php
 * Login simplificado para administradores - similar a login.php pero verifica que sea admin
 */

// Manejar OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 3600');
    header('Content-Length: 0');
    http_response_code(200);
    exit(0);
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';

// Verificar si el archivo autoload.php existe
$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    echo json_encode([
        'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).',
        'details' => 'El archivo ' . $autoload_path . ' no fue encontrado.'
    ]);
    exit();
}

require $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Usar el mismo secret key que config.php
$secret_key = $jwt_secret;

// Configuración del token - 7 días de expiración
$issuedAt = time();
$expirationTime = $issuedAt + (3600 * 24 * 7); // 7 días
$issuer = "arcusx.pro";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');

    $raw_data = file_get_contents('php://input');
    $data = json_decode($raw_data, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['message' => 'Error al decodificar JSON: ' . json_last_error_msg()]);
        exit();
    }

    if (!isset($data['email'], $data['password'])) {
        http_response_code(400);
        echo json_encode(['message' => 'Faltan email o password.']);
        exit();
    }

    $email = $data['email'];
    $password = $data['password'];

    if (!isset($conn) || $conn->connect_error) {
        http_response_code(500);
        echo json_encode(['message' => 'Error de conexión a la base de datos.']);
        exit();
    }

    // Consulta para obtener usuario con verificación de admin
    $stmt = $conn->prepare("SELECT id, username, email, password, is_admin, role FROM users WHERE email = ?");

    if ($stmt === false) {
        http_response_code(500);
        echo json_encode(['message' => 'Error interno al preparar la consulta SQL.', 'error' => $conn->error]);
        exit();
    }

    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        // Verificar la contraseña
        if (password_verify($password, $user['password'])) {
            
            // VERIFICAR QUE SEA ADMIN - CRÍTICO
            if ($user['is_admin'] != 1 && $user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['message' => 'Acceso denegado. Se requieren permisos de administrador.']);
                $stmt->close();
                $conn->close();
                exit();
            }

            // Payload del token JWT - mismo formato que login.php
            $payload = [
                'iat' => $issuedAt,
                'exp' => $expirationTime,
                'iss' => $issuer,
                'data' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'is_admin' => true,
                    'role' => $user['role'] ?? 'admin'
                ]
            ];

            // Generar el token JWT con el mismo secret key
            $jwt = JWT::encode($payload, $secret_key, 'HS256');

            http_response_code(200);
            echo json_encode([
                'message' => 'Login exitoso',
                'token' => $jwt,
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'is_admin' => true,
                    'role' => $user['role'] ?? 'admin'
                ]
            ]);

        } else {
            http_response_code(401);
            echo json_encode(['message' => 'Credenciales incorrectas.']);
        }
    } else {
        http_response_code(401);
        echo json_encode(['message' => 'Credenciales incorrectas.']);
    }

    $stmt->close();
    $conn->close();

} else {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido.']);
}
?>
