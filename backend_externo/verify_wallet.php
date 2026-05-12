<?php
// verify_wallet.php
require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, OPTIONS');

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

error_log('=== Iniciando verify_wallet.php ===');
error_log('REQUEST_METHOD: ' . ($_SERVER['REQUEST_METHOD'] ?? ''));
error_log('REQUEST_URI: ' . ($_SERVER['REQUEST_URI'] ?? ''));
error_log('ORIGIN: ' . ($_SERVER['HTTP_ORIGIN'] ?? ''));

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = arcusx_jwt_user_id();

    if ($loggedInUserId === null) {
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