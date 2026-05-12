<?php
require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, POST, OPTIONS');
arcusx_cors_apply('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

require_once 'config.php';
require_once 'vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = arcusx_jwt_user_id();

    if ($userId === null) {
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