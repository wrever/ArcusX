<?php
/**
 * Endpoint para marcar una notificación como leída
 * POST /api/auth/mark_notification_read.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Body: { "notification_id": 123 }
 */

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        try {
            JWT::$leeway = 300;
            $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
            if (isset($decoded->data->id)) {
                return (int)$decoded->data->id;
            }
        } catch (Exception $e) {
            error_log("JWT Error en mark_notification_read.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = getLoggedInUserId($conn, $jwt_secret);
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'
        ]);
        $conn->close();
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['notification_id']) || !is_numeric($data['notification_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID de notificación inválido o faltante.'
        ]);
        $conn->close();
        exit;
    }
    
    $notificationId = (int)$data['notification_id'];
    
    // Verificar que la notificación existe y pertenece al usuario (o es global)
    $checkStmt = $conn->prepare("SELECT id, user_id FROM notifications WHERE id = ?");
    $checkStmt->bind_param("i", $notificationId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        $checkStmt->close();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Notificación no encontrada.'
        ]);
        $conn->close();
        exit;
    }
    
    $notification = $result->fetch_assoc();
    $checkStmt->close();
    
    // Verificar que la notificación es global (user_id IS NULL) o pertenece al usuario
    if ($notification['user_id'] !== null && (int)$notification['user_id'] !== $userId) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'No tienes permiso para marcar esta notificación como leída.'
        ]);
        $conn->close();
        exit;
    }
    
    // Actualizar el estado is_read a 1 (true)
    $updateStmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE id = ?");
    $updateStmt->bind_param("i", $notificationId);
    
    if ($updateStmt->execute()) {
        $updateStmt->close();
        echo json_encode([
            'success' => true,
            'message' => 'Notificación marcada como leída correctamente.'
        ]);
    } else {
        $updateStmt->close();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al actualizar la notificación: ' . $conn->error
        ]);
    }
    
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
}
?>

