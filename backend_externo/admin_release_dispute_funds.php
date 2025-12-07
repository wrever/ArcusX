<?php
/**
 * Endpoint para liberar fondos del escrow después de resolver una disputa
 * POST /api/auth/admin_release_dispute_funds.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Body: { "dispute_id": 123 }
 * 
 * Este endpoint genera la transacción XDR para reembolsar o liberar fondos
 * según la resolución de la disputa. El admin debe firmar la transacción desde el frontend.
 */

require_once 'config.php';
require_once 'admin_common.php';

header('Content-Type: application/json; charset=UTF-8');

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse(405, 'Método no permitido.');
    exit;
}

// Autenticar usuario admin
$loggedInUser = getLoggedInUser($conn, $jwt_secret);
if (!$loggedInUser) {
    sendErrorResponse(401, 'Acceso no autorizado: Token JWT no proporcionado o inválido.');
    exit;
}

requireAdmin($conn, $loggedInUser);

$data = json_decode(file_get_contents('php://input'), true);
$disputeId = isset($data['dispute_id']) ? (int)$data['dispute_id'] : 0;

if ($disputeId <= 0) {
    sendErrorResponse(400, 'ID de disputa inválido.');
    exit;
}

try {
    // Obtener información de la disputa y la tarea
    $stmt = $conn->prepare("
        SELECT 
            d.id as dispute_id,
            d.status as dispute_status,
            d.resolution,
            t.id as task_id,
            t.price,
            t.escrow_id,
            t.escrow_secret,
            t.escrow_status,
            u1.wallet_address as client_wallet,
            u2.wallet_address as worker_wallet
        FROM disputes d
        INNER JOIN tasks t ON d.task_id = t.id
        LEFT JOIN users u1 ON t.user_id = u1.id
        LEFT JOIN users u2 ON t.accepted_applicant_id = u2.id
        WHERE d.id = ?
    ");
    $stmt->bind_param("i", $disputeId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        sendErrorResponse(404, 'Disputa no encontrada.');
        exit;
    }
    
    $disputeData = $result->fetch_assoc();
    $stmt->close();
    
    // Verificar que la disputa está resuelta
    if ($disputeData['dispute_status'] !== 'resolved') {
        sendErrorResponse(400, 'La disputa debe estar resuelta antes de liberar fondos.');
        exit;
    }
    
    // Este endpoint está deprecado - Trustless Work maneja todo directamente
    // La liberación de fondos se maneja desde DisputeManagement.tsx usando resolveDisputeTrustlessEscrow
    sendErrorResponse(410, 'Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work. La liberación de fondos se maneja directamente a través de Trustless Work API desde el frontend.');
    
} catch (Exception $e) {
    error_log('Error en admin_release_dispute_funds.php: ' . $e->getMessage());
    sendErrorResponse(500, 'Error interno del servidor: ' . $e->getMessage());
} finally {
    $conn->close();
}
?>

