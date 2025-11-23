<?php
// get_messages.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['task_id'])) {
        http_response_code(400);
        echo json_encode(['message' => 'Falta el ID de la tarea']);
        exit;
    }

    $task_id = intval($_GET['task_id']);
    
    // Obtener mensajes con información del remitente
    $sql = "SELECT m.*, u.username as sender_username 
            FROM messages m 
            JOIN users u ON m.sender_id = u.id 
            WHERE m.task_id = $task_id 
            ORDER BY m.created_at ASC";

    $result = $conn->query($sql);

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['message' => 'Error al obtener mensajes: ' . $conn->error]);
        exit;
    }

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }

    http_response_code(200);
    echo json_encode($messages);
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
}
?>