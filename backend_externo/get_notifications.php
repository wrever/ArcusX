<?php
/**
 * Endpoint para obtener notificaciones del usuario autenticado
 * GET /api/auth/get_notifications.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * 
 * Retorna notificaciones globales (user_id = NULL) y notificaciones individuales del usuario
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function fix_utf8_mojibake($str) {
    if (!is_string($str) || $str === '') return $str;
    $bytes = @mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    if ($bytes === false) return $str;
    if (!mb_check_encoding($bytes, 'UTF-8')) return $str;
    return $bytes;
}

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

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
            error_log("JWT Error en get_notifications.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
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
    
    // Parámetros de paginación
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    
    // Obtener notificaciones: globales (user_id IS NULL) o específicas del usuario (user_id = $userId)
    // Para notificaciones globales, usar is_read de la tabla notifications
    // Para notificaciones individuales, usar is_read de la tabla notifications
    $sql = "SELECT 
                n.id,
                n.user_id,
                n.title,
                n.message,
                n.type,
                n.created_at,
                CASE 
                    WHEN n.user_id IS NULL THEN 1 
                    ELSE 0 
                END as is_global,
                n.is_read
            FROM notifications n
            WHERE n.user_id IS NULL OR n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al preparar la consulta: ' . $conn->error
        ]);
        $conn->close();
        exit;
    }
    
    $stmt->bind_param("iii", $userId, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        $notifications[] = [
            'id' => (int)$row['id'],
            'user_id' => $row['user_id'] ? (int)$row['user_id'] : null,
            'title' => fix_utf8_mojibake($row['title'] ?? ''),
            'message' => fix_utf8_mojibake($row['message'] ?? ''),
            'type' => $row['type'],
            'created_at' => $row['created_at'],
            'is_global' => (bool)$row['is_global'],
            'is_read' => (bool)$row['is_read']
        ];
    }
    $stmt->close();
    
    // Contar total de notificaciones (globales + individuales)
    $countSql = "SELECT COUNT(*) as total 
                 FROM notifications 
                 WHERE user_id IS NULL OR user_id = ?";
    $countStmt = $conn->prepare($countSql);
    $countStmt->bind_param("i", $userId);
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $total = (int)$countResult->fetch_assoc()['total'];
    $countStmt->close();
    
    // Contar no leídas
    $unreadSql = "SELECT COUNT(*) as unread 
                  FROM notifications 
                  WHERE (user_id IS NULL OR user_id = ?) 
                  AND is_read = 0";
    $unreadStmt = $conn->prepare($unreadSql);
    $unreadStmt->bind_param("i", $userId);
    $unreadStmt->execute();
    $unreadResult = $unreadStmt->get_result();
    $unread = (int)$unreadResult->fetch_assoc()['unread'];
    $unreadStmt->close();
    
    echo json_encode([
        'success' => true,
        'notifications' => $notifications,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => ceil($total / $limit)
        ],
        'unread_count' => $unread
    ]);
    
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
}
?>

