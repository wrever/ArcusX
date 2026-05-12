<?php
/**
 * DEPRECATED: Este endpoint ya no se usa.
 * El sistema ahora usa exclusivamente Trustless Work para manejar escrows.
 * Trustless Work maneja las firmas automáticamente a través de su API.
 *
 * @deprecated Desde la migración a Trustless Work
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');
arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
    exit;
}

http_response_code(410);
echo json_encode([
    'success' => false,
    'message' => 'Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work, que maneja las firmas automáticamente.',
]);
exit;
