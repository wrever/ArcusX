<?php
// register_wallet.php
require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

error_log('=== Iniciando register_wallet.php ===');
error_log('REQUEST_METHOD: ' . ($_SERVER['REQUEST_METHOD'] ?? ''));
error_log('REQUEST_URI: ' . ($_SERVER['REQUEST_URI'] ?? ''));
error_log('ORIGIN: ' . ($_SERVER['HTTP_ORIGIN'] ?? ''));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $loggedInUserId = arcusx_require_user_id();

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