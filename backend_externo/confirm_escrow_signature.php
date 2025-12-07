<?php
/**
 * DEPRECATED: Este endpoint ya no se usa.
 * El sistema ahora usa exclusivamente Trustless Work para manejar escrows.
 * Trustless Work maneja las firmas automáticamente a través de su API.
 * 
 * Este archivo se mantiene solo para referencia histórica.
 * 
 * @deprecated Desde la migración a Trustless Work
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
    exit;
}

// Este endpoint está deprecado
http_response_code(410); // Gone
echo json_encode([
    'success' => false,
    'message' => 'Este endpoint está deprecado. El sistema ahora usa exclusivamente Trustless Work, que maneja las firmas automáticamente.'
]);
exit;

// Función para obtener usuario del JWT
function getLoggedInUserId($conn) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (strpos($authHeader, 'Bearer ') !== 0) {
        return null;
    }
    
    $token = substr($authHeader, 7);
    
    try {
        $decoded = JWT::decode($token, $jwt_secret, array('HS256'));
        return $decoded->user_id;
    } catch (Exception $e) {
        return null;
    }
}

// Función para verificar firma en blockchain (simulado por ahora)
function verifyEscrowSignature($contractAddress, $transactionHash) {
    // TODO: Implementar verificación real con blockchain
    // Por ahora simulamos que la firma es válida
    
    return [
        'success' => true,
        'verified' => true,
        'transaction_hash' => $transactionHash,
        'block_number' => rand(1000000, 9999999),
        'gas_used' => rand(100000, 500000)
    ];
}

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['message' => 'Datos JSON inválidos']);
        exit;
    }
    
    $taskId = $input['task_id'] ?? null;
    $contractAddress = $input['contract_address'] ?? null;
    $transactionHash = $input['transaction_hash'] ?? null;
    
    if (!$taskId || !$contractAddress || !$transactionHash) {
        http_response_code(400);
        echo json_encode(['message' => 'task_id, contract_address y transaction_hash son requeridos']);
        exit;
    }
    
    // Verificar autenticación
    $clientId = getLoggedInUserId($conn);
    if (!$clientId) {
        http_response_code(401);
        echo json_encode(['message' => 'Token de autenticación inválido']);
        exit;
    }
    
    // Verificar que la tarea existe y pertenece al cliente
    $stmt = $conn->prepare("
        SELECT t.id, t.escrow_id, t.escrow_status, t.accepted_applicant_id
        FROM tasks t
        WHERE t.id = ? AND t.user_id = ?
    ");
    $stmt->bind_param("ii", $taskId, $clientId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['message' => 'Tarea no encontrada o no tienes permisos']);
        exit;
    }
    
    $taskData = $result->fetch_assoc();
    
    // Detectar si es Trustless Work (contract ID empieza con 'C')
    $isTrustlessWork = !empty($taskData['escrow_id']) && 
                      strlen($taskData['escrow_id']) >= 32 && 
                      substr($taskData['escrow_id'], 0, 1) === 'C';
    
    if ($isTrustlessWork) {
        http_response_code(400);
        echo json_encode(['message' => 'Este endpoint no aplica para escrows de Trustless Work. Trustless Work maneja las firmas automáticamente.']);
        exit;
    }
    
    // Verificar que el estado es 'pending_signature' (solo para multisig)
    if ($taskData['escrow_status'] !== 'pending_signature') {
        http_response_code(400);
        echo json_encode(['message' => 'El escrow no está en estado pending_signature']);
        exit;
    }
    
    // Verificar que el contrato coincide
    if ($taskData['escrow_id'] !== $contractAddress) {
        http_response_code(400);
        echo json_encode(['message' => 'Dirección del contrato no coincide']);
        exit;
    }
    
    // Verificar firma en blockchain
    $verificationResult = verifyEscrowSignature($contractAddress, $transactionHash);
    
    if (!$verificationResult['success'] || !$verificationResult['verified']) {
        http_response_code(400);
        echo json_encode(['message' => 'Firma del contrato no verificada']);
        exit;
    }
    
    // Actualizar estado del escrow a activo (solo para multisig)
    $stmt = $conn->prepare("
        UPDATE tasks 
        SET escrow_status = 'active',
            escrow_created_at = NOW()
        WHERE id = ?
    ");
    $stmt->bind_param("i", $taskId);
    $stmt->execute();
    
    // Log de éxito
    error_log("Escrow firmado y activado - Task: $taskId, Contract: $contractAddress, TX: $transactionHash");
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'message' => 'Contrato firmado y activado exitosamente',
        'contract_address' => $contractAddress,
        'transaction_hash' => $transactionHash,
        'block_number' => $verificationResult['block_number'],
        'gas_used' => $verificationResult['gas_used'],
        'status' => 'active'
    ]);
    
} catch (Exception $e) {
    error_log("Error en confirm_escrow_signature.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['message' => 'Error interno del servidor']);
}
?>
