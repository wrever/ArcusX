<?php
/**
 * Endpoint para verificar Human ID de un usuario
 * HUMAN ID REACTIVADO
 * 
 * GET /api/auth/verify_human_id.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * 
 * Response:
 * {
 *   "success": true,
 *   "verified": true/false,
 *   "stellar_address": "G...",
 *   "message": "Usuario verificado" / "Usuario no verificado"
 * }
 */

// Manejar CORS - DEBE estar al principio, antes de cualquier output
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = $jwt_secret;

function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        return null;
    }
    $authHeader = $headers['Authorization'];
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return null;
    }
    $jwt = $matches[1];
    try {
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        if (isset($decoded->data->id)) {
            return (string) $decoded->data->id;
        }
        return null;
    } catch (Exception $e) {
        error_log("JWT Error in verify_human_id.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Verificar si se está consultando por user_id en query params
    $requestedUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    $userId = getLoggedInUserId($conn, $secret_key);
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'message' => 'No autorizado. Token JWT requerido.'
        ]);
        exit;
    }
    
    // Si se especificó un user_id en la query, usar ese (pero verificar que sea el mismo usuario logueado)
    if ($requestedUserId && $requestedUserId != $userId) {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'message' => 'No tienes permiso para verificar otro usuario.'
        ]);
        exit;
    }
    
    // Usar el user_id de la query si existe, sino el del token
    $userIdToCheck = $requestedUserId ? $requestedUserId : $userId;

    // Obtener dirección Stellar del usuario, estado de verificación y action-id
    $stmt = $conn->prepare("SELECT wallet_address, human_id_verified, human_id_action_id FROM users WHERE id = ?");
    $stmt->bind_param("i", $userIdToCheck);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false, 
            'message' => 'Usuario no encontrado'
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Si ya está verificado en la BD, devolver directamente
    if ($user && isset($user['human_id_verified']) && $user['human_id_verified'] == 1) {
        echo json_encode([
            'success' => true,
            'verified' => true,
            'is_human_id_verified' => true,
            'stellar_address' => $user['wallet_address'] ?? null,
            'action_id' => $user['human_id_action_id'] ?? null,
            'message' => 'Usuario verificado con Human ID'
        ]);
        exit;
    }
    
    // Verificar si tiene wallet válida
    $walletAddress = isset($user['wallet_address']) ? trim($user['wallet_address']) : '';
    $hasValidWallet = !empty($walletAddress) && preg_match('/^G[A-Z0-9]{55}$/', $walletAddress);
    
    if (!$hasValidWallet) {
        // Si no tiene wallet o la wallet es inválida, devolver que no está verificado pero no es un error
        echo json_encode([
            'success' => true,
            'verified' => false,
            'is_human_id_verified' => false,
            'stellar_address' => null,
            'action_id' => null,
            'message' => 'Usuario no tiene wallet Stellar configurada. Por favor, conecta tu wallet primero.'
        ]);
        exit;
    }

    $stellarAddress = $walletAddress;
    
    // Si se proporciona un action_id en la query, usarlo; sino, usar el almacenado o generar uno nuevo
    if (isset($_GET['action_id']) && !empty($_GET['action_id'])) {
        $actionId = $_GET['action_id'];
    } else {
        // Si el usuario ya tiene un action_id, usarlo; sino, generar uno nuevo único
        if (!empty($user['human_id_action_id'])) {
            $actionId = $user['human_id_action_id'];
        } else {
            // Generar un action_id único basado en user_id + timestamp
            $actionId = 'arcusx_' . $userIdToCheck . '_' . time() . '_' . mt_rand(1000, 9999);
            // Guardar el nuevo action_id en la base de datos
            $stmt = $conn->prepare("UPDATE users SET human_id_action_id = ? WHERE id = ?");
            $stmt->bind_param("si", $actionId, $userIdToCheck);
            $stmt->execute();
            $stmt->close();
        }
    }
    
    // Consultar API de Holonym para verificación por teléfono (gratuita)
    // Nota: Usamos 'phone' en lugar de 'gov-id' para evitar costos
    $apiUrl = "https://api.holonym.io/sybil-resistance/phone/stellar?user=" . 
              urlencode($stellarAddress) . "&action-id=" . urlencode($actionId);
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Timeout de 10 segundos
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        error_log("Error en cURL verify_human_id.php: " . $curlError);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Error conectando con Human ID API: ' . $curlError
        ]);
        exit;
    }
    
    if ($httpCode !== 200) {
        error_log("Human ID API returned status: " . $httpCode);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Error consultando Human ID API. Código: ' . $httpCode
        ]);
        exit;
    }
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Error decodificando JSON de Human ID API: " . json_last_error_msg());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Error procesando respuesta de Human ID API'
        ]);
        exit;
    }
    
    $isUnique = isset($data['result']) && $data['result'] === true;
    
    // Actualizar base de datos
    $stmt = $conn->prepare("
        UPDATE users 
        SET human_id_verified = ?, 
            human_id_verified_at = NOW()
        WHERE id = ?
    ");
    $verified = $isUnique ? 1 : 0;
    $stmt->bind_param("ii", $verified, $userIdToCheck);
    
    if (!$stmt->execute()) {
        error_log("Error actualizando BD verify_human_id.php: " . $stmt->error);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Error actualizando base de datos'
        ]);
        $stmt->close();
        exit;
    }
    
    $stmt->close();
    
    echo json_encode([
        'success' => true,
        'verified' => $isUnique,
        'is_human_id_verified' => $isUnique,
        'stellar_address' => $stellarAddress,
        'action_id' => $actionId,
        'message' => $isUnique 
            ? 'Usuario verificado con Human ID' 
            : 'Usuario no verificado con Human ID'
    ]);
    
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Endpoint para generar un nuevo action_id (resetear intentos)
    $userId = getLoggedInUserId($conn, $secret_key);
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'message' => 'No autorizado. Token JWT requerido.'
        ]);
        exit;
    }
    
    // Generar un nuevo action_id único (con timestamp y random para asegurar unicidad)
    $newActionId = 'arcusx_' . $userId . '_' . time() . '_' . mt_rand(1000, 9999);
    
    error_log("Generando nuevo action_id para usuario $userId: $newActionId");
    
    // Actualizar en la base de datos
    $stmt = $conn->prepare("UPDATE users SET human_id_action_id = ? WHERE id = ?");
    if ($stmt === false) {
        error_log("Error preparando UPDATE action_id: " . $conn->error);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Error preparando consulta: ' . $conn->error
        ]);
        exit;
    }
    
    $stmt->bind_param("si", $newActionId, $userId);
    
    if (!$stmt->execute()) {
        error_log("Error actualizando action_id verify_human_id.php: " . $stmt->error);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Error generando nuevo action_id: ' . $stmt->error
        ]);
        $stmt->close();
        exit;
    }
    
    $affectedRows = $stmt->affected_rows;
    $stmt->close();
    
    error_log("Action_id actualizado exitosamente. Filas afectadas: $affectedRows");
    
    echo json_encode([
        'success' => true,
        'action_id' => $newActionId,
        'message' => 'Nuevo action_id generado exitosamente. Ahora tienes 3 intentos más disponibles.'
    ]);
    
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false, 
        'message' => 'Método no permitido. Use GET o POST.'
    ]);
}

$conn->close();
?>
