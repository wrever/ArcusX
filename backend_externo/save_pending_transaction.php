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

// Deshabilitar display_errors para evitar output antes de headers
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');

require_once __DIR__ . '/config.php';
$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: dependencias no encontradas.']);
    exit;
}
require $autoload_path;
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
    if (isset($conn) && $conn) $conn->close();
    exit;
} else {
    if (!headers_sent()) {
        arcusx_cors_apply('POST, OPTIONS');
        header('Content-Type: application/json; charset=UTF-8');
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>

