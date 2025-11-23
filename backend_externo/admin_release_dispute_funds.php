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
    
    // Verificar que hay un escrow activo
    if (empty($disputeData['escrow_id']) || empty($disputeData['escrow_secret'])) {
        sendErrorResponse(400, 'No hay escrow asociado a esta disputa o falta el secret key.');
        exit;
    }
    
    // Parsear resolución
    $resolution = json_decode($disputeData['resolution'], true);
    if (!$resolution || !isset($resolution['decision'])) {
        sendErrorResponse(400, 'Resolución de disputa inválida.');
        exit;
    }
    
    $decision = $resolution['decision'];
    $refundAmount = isset($resolution['refund_to_client']) ? (float)$resolution['refund_to_client'] : 0;
    $paymentAmount = isset($resolution['pay_to_worker']) ? (float)$resolution['pay_to_worker'] : 0;
    
    // Validar wallets
    if (empty($disputeData['client_wallet']) || empty($disputeData['worker_wallet'])) {
        sendErrorResponse(400, 'Faltan direcciones de wallet del cliente o trabajador.');
        exit;
    }
    
    // Retornar información necesaria para generar la transacción desde el frontend
    // El frontend usará esta información para crear y firmar la transacción de Stellar
    echo json_encode([
        'success' => true,
        'dispute_id' => $disputeId,
        'task_id' => $disputeData['task_id'],
        'escrow_id' => $disputeData['escrow_id'],
        'escrow_secret' => $disputeData['escrow_secret'], // IMPORTANTE: Solo para generar XDR, debe manejarse con cuidado
        'client_wallet' => $disputeData['client_wallet'],
        'worker_wallet' => $disputeData['worker_wallet'],
        'decision' => $decision,
        'refund_amount' => $refundAmount,
        'payment_amount' => $paymentAmount,
        'instructions' => [
            'Para reembolso completo (decision=client):',
            '  - Usar refundFunds() con escrow_secret y client_wallet',
            '  - Monto: ' . $refundAmount . ' USDC',
            '',
            'Para pago completo (decision=worker):',
            '  - Usar releaseFunds() con escrow_secret, client_wallet y worker_wallet',
            '  - Requiere firmas de ambas partes',
            '  - Monto: ' . $paymentAmount . ' USDC',
            '',
            'Para split:',
            '  - Primero reembolsar al cliente: ' . $refundAmount . ' USDC',
            '  - Luego pagar al trabajador: ' . $paymentAmount . ' USDC'
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Error en admin_release_dispute_funds.php: ' . $e->getMessage());
    sendErrorResponse(500, 'Error interno del servidor: ' . $e->getMessage());
} finally {
    $conn->close();
}
?>

