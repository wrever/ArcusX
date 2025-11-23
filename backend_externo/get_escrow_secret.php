<?php
/**
 * Endpoint para obtener el escrowKeypairSecret de forma segura
 * Solo el cliente (dueño de la tarea) puede obtener el secret
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

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
        error_log("JWT Error in get_escrow_secret.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
        exit;
    }

    if (!isset($_GET['task_id']) || !is_numeric($_GET['task_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'task_id requerido']);
        exit;
    }

    $taskId = intval($_GET['task_id']);

    try {
        // Verificar que la tarea existe y pertenece al usuario logueado
        $stmt = $conn->prepare("
            SELECT escrow_secret 
            FROM tasks 
            WHERE id = ? AND user_id = ?
        ");
        $stmt->bind_param("ii", $taskId, $loggedInUserId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea no encontrada o no tienes permisos']);
            exit;
        }

        $taskData = $result->fetch_assoc();
        $stmt->close();

        if (empty($taskData['escrow_secret'])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Secret key no encontrado para esta tarea']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'escrow_secret' => $taskData['escrow_secret']
        ]);

    } catch (Exception $e) {
        error_log('Error en get_escrow_secret.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>

