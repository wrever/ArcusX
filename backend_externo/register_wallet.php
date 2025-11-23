<?php
// register_wallet.php

// CORS headers - DEBEN IR PRIMERO, ANTES DE CUALQUIER OTRO OUTPUT
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.one',
    'http://arcusx.one'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Manejar preflight OPTIONS request PRIMERO
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit();
}

// Headers CORS para requests normales
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Habilitar logs
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');
error_log("=== Iniciando register_wallet.php ===");
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['wallet_address'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Falta la dirección de wallet.']);
        exit;
    }

    $walletAddress = trim($data['wallet_address']);

    // Validar formato de dirección Stellar (empieza con G y tiene 56 caracteres)
    // Validación más permisiva: solo verifica longitud, que empiece con G y caracteres alfanuméricos
    if (strlen($walletAddress) !== 56) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'La dirección de wallet Stellar debe tener exactamente 56 caracteres.']);
        exit;
    }
    
    if (substr($walletAddress, 0, 1) !== 'G') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'La dirección de wallet Stellar debe empezar con la letra G.']);
        exit;
    }
    
    if (!preg_match('/^G[A-Z0-9]{55}$/', $walletAddress)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'La dirección de wallet Stellar contiene caracteres inválidos. Solo se permiten letras mayúsculas y números.']);
        exit;
    }

    try {
        // Verificar si el usuario ya tiene una wallet registrada
        $stmt_check = $conn->prepare("SELECT wallet_address FROM users WHERE id = ?");
        if ($stmt_check === false) {
            throw new Exception('Error al preparar la verificación: ' . $conn->error);
        }
        $stmt_check->bind_param("i", $loggedInUserId);
        if (!$stmt_check->execute()) {
            throw new Exception('Error al verificar wallet existente: ' . $stmt_check->error);
        }
        $result_check = $stmt_check->get_result();
        $existing_wallet = $result_check->fetch_assoc();

        if ($existing_wallet && !is_null($existing_wallet['wallet_address'])) {
            // El usuario ya tiene una wallet registrada
            if ($existing_wallet['wallet_address'] === $walletAddress) {
                // Es la misma wallet, devolver éxito
                echo json_encode([
                    'success' => true,
                    'message' => 'Wallet ya registrada y verificada.',
                    'wallet_address' => $walletAddress,
                    'already_registered' => true
                ]);
            } else {
                // Es una wallet diferente, rechazar
                http_response_code(400);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Ya tienes una wallet registrada permanentemente. No puedes cambiar a otra wallet.',
                    'existing_wallet' => $existing_wallet['wallet_address']
                ]);
            }
            exit;
        }

        // Verificar que la wallet no esté siendo usada por otro usuario
        $stmt_check_duplicate = $conn->prepare("SELECT id, username FROM users WHERE wallet_address = ?");
        if ($stmt_check_duplicate === false) {
            throw new Exception('Error al preparar verificación de duplicado: ' . $conn->error);
        }
        $stmt_check_duplicate->bind_param("s", $walletAddress);
        if (!$stmt_check_duplicate->execute()) {
            throw new Exception('Error al verificar duplicado: ' . $stmt_check_duplicate->error);
        }
        $result_duplicate = $stmt_check_duplicate->get_result();
        
        if ($result_duplicate->num_rows > 0) {
            $duplicate_user = $result_duplicate->fetch_assoc();
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'message' => 'Esta wallet ya está registrada por otro usuario: ' . $duplicate_user['username']
            ]);
            exit;
        }

        // Registrar la nueva wallet
        $stmt_register = $conn->prepare("UPDATE users SET wallet_address = ?, updated_at = NOW() WHERE id = ?");
        if ($stmt_register === false) {
            throw new Exception('Error al preparar el registro: ' . $conn->error);
        }
        $stmt_register->bind_param("si", $walletAddress, $loggedInUserId);
        
        if (!$stmt_register->execute()) {
            throw new Exception('Error al registrar wallet: ' . $stmt_register->error);
        }

        if ($stmt_register->affected_rows > 0) {
            error_log("Wallet registrada exitosamente para usuario ID: " . $loggedInUserId . ", Wallet: " . $walletAddress);
            
            echo json_encode([
                'success' => true,
                'message' => 'Wallet registrada exitosamente. Esta dirección será permanente.',
                'wallet_address' => $walletAddress,
                'already_registered' => false
            ]);
        } else {
            throw new Exception('No se pudo registrar la wallet. Usuario no encontrado.');
        }

    } catch (Exception $e) {
        error_log('Error en register_wallet.php: ' . $e->getMessage());
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