<?php
/**
 * DEPRECATED: Este endpoint ya no se usa.
 * El sistema ahora usa exclusivamente Trustless Work para manejar escrows.
 * Trustless Work maneja las transacciones directamente a través de su API.
 * 
 * Este archivo se mantiene solo para referencia histórica.
 * 
 * @deprecated Desde la migración a Trustless Work
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, POST, OPTIONS');
arcusx_cors_apply('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

// Habilitar logs (pero NO mostrar errores en pantalla para evitar output antes de headers)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $loggedInUserId = arcusx_jwt_user_id();

        if ($loggedInUserId === null) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
            exit;
        }

        // Este endpoint está deprecado - Trustless Work maneja todo directamente
        http_response_code(410); // Gone
        echo json_encode([
            'success' => false,
            'message' => 'Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work, que maneja las transacciones directamente a través de su API.'
        ]);
        exit;
    } catch (Exception $e) {
        error_log('Error en get_pending_transaction.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>

