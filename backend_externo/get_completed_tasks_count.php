<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function getLoggedInUserId($conn) {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        if (!$jwt) return null;
        try {
            $secretKey = 'SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY';
            $decoded = JWT::decode($jwt, new Key($secretKey, 'HS256'));
            return $decoded->data->id;
        } catch (Exception $e) {
            error_log("JWT Error: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = getLoggedInUserId($conn);

    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.']);
        $conn->close();
        exit;
    }

    // ¡AQUÍ EL CAMBIO!
   $sql = "SELECT completed_tasks_count FROM users WHERE id = ?";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $completedTasksCount = $row['completed_tasks_count'];

        echo json_encode(['success' => true, 'completed_tasks_count' => $completedTasksCount]);
        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta: ' . $conn->error]);
    }

    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>