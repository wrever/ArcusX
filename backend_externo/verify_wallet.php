<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
// verify_wallet.php

// CORS headers
$allowed_origins = [
    'http://localhost:5173',
    'https://arcusx.pro',
    'http://arcusx.pro'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Habilitar logs
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');
error_log("=== Iniciando verify_wallet.php ===");
error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("REQUEST_URI: " . $_SERVER['REQUEST_URI']);
error_log("ORIGIN: " . $origin);

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

// Función para obtener el ID del usuario logueado desde el token JWT
function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        error_log('Auth header missing');
        return null;
    }
    $authHeader = $headers['Authorization'];
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        error_log('Auth header format incorrect');
        return null;
    }
    $jwt = $matches[1];
    try {
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        error_log('Decoded JWT: ' . print_r($decoded, true));
        if (isset($decoded->data->id)) {
            return (string) $decoded->data->id;
        } else {
            error_log('User ID not found in JWT payload');
            return null;
        }
    } catch (\Firebase\JWT\ExpiredException $e) {
        error_log('JWT Expired: ' . $e->getMessage());
        return null;
    } catch (\Firebase\JWT\SignatureInvalidException $e) {
        error_log('JWT Signature Invalid: ' . $e->getMessage());
        return null;
    } catch (Exception $e) {
        error_log('Error decoding token: ' . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.']);
        exit;
    }

    try {
        // Verificar si el usuario ya tiene una wallet registrada
        $stmt_check = $conn->prepare("SELECT wallet_address, username FROM users WHERE id = ?");
        if ($stmt_check === false) {
            throw new Exception('Error al preparar la verificación: ' . $conn->error);
        }
        $stmt_check->bind_param("i", $loggedInUserId);
        if (!$stmt_check->execute()) {
            throw new Exception('Error al verificar wallet: ' . $stmt_check->error);
        }
        $result_check = $stmt_check->get_result();
        $user_data = $result_check->fetch_assoc();

        if ($user_data && !is_null($user_data['wallet_address'])) {
            // El usuario tiene wallet registrada
            error_log("Usuario ID: " . $loggedInUserId . " ya tiene wallet registrada: " . $user_data['wallet_address']);
            
            echo json_encode([
                'success' => true,
                'has_wallet' => true,
                'wallet_address' => $user_data['wallet_address'],
                'username' => $user_data['username'],
                'message' => 'Usuario ya tiene wallet registrada'
            ]);
        } else {
            // El usuario no tiene wallet registrada
            error_log("Usuario ID: " . $loggedInUserId . " no tiene wallet registrada");
            
            echo json_encode([
                'success' => true,
                'has_wallet' => false,
                'wallet_address' => null,
                'username' => $user_data['username'] ?? null,
                'message' => 'Usuario no tiene wallet registrada'
            ]);
        }

    } catch (Exception $e) {
        error_log('Error en verify_wallet.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    $conn->close();

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    error_log("Method not allowed: " . $_SERVER['REQUEST_METHOD']);
}
?>