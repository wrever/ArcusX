<?php
/**
 * DEPRECATED: Este endpoint ya no se usa.
 * El sistema ahora usa exclusivamente Trustless Work para manejar escrows.
 * Trustless Work no usa secret keys - usa contract IDs.
 *
 * Este archivo se mantiene solo para referencia histórica.
 *
 * @deprecated Desde la migración a Trustless Work
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, GET, OPTIONS');
arcusx_cors_apply('POST, GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/config.php';
$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: dependencias no encontradas.']);
    exit;
}
require_once $autoload_path;
require_once __DIR__ . '/auth_bearer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$loggedInUserId = arcusx_jwt_user_id();
if ($loggedInUserId === null) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['task_id']) || !is_numeric($data['task_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'task_id requerido']);
    exit;
}
if (!isset($data['escrow_secret']) || empty($data['escrow_secret'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'escrow_secret requerido']);
    exit;
}

// Este endpoint está deprecado - Trustless Work no usa secret keys
http_response_code(410); // Gone
echo json_encode([
    'success' => false,
    'message' => 'Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work, que no requiere secret keys.'
]);
$conn->close();
?>

