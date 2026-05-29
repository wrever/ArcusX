<?php
/**
 * Vincula ref_code + device_fp en servidor (cookie HttpOnly + Supabase pending).
 * Llamar al abrir /ref/CODE o antes de OAuth — no requiere sesión.
 */
require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');

require_once __DIR__ . '/referral_supabase.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$refCode = isset($data['ref_code']) ? arcusx_referral_normalize_code((string) $data['ref_code']) : '';
$deviceFp = isset($data['device_fp']) ? trim((string) $data['device_fp']) : '';

if ($refCode === '' || $deviceFp === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ref_code y device_fp requeridos']);
    exit();
}

if (!preg_match('/^ax-[a-z0-9]+-[a-z0-9]+$/i', $deviceFp) || strlen($deviceFp) > 80) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'device_fp inválido']);
    exit();
}

if (!arcusx_referral_code_is_active($refCode)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Código no válido']);
    exit();
}

if (!arcusx_referral_public_rate_limit('bind-pending', 40)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Demasiados intentos; espera un momento']);
    exit();
}

arcusx_referral_set_bind_cookie($refCode);

$bind = arcusx_referral_bind_pending($deviceFp, $refCode);
$configured = arcusx_referral_supabase_config() !== null;

echo json_encode([
    'success' => true,
    'ref_code' => $refCode,
    'cookie_set' => true,
    'pending_saved' => $bind['ok'] ?? false,
    'supabase_configured' => $configured,
]);
