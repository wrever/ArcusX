<?php
require_once 'config.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido. Solo se permite GET.']);
    exit();
}

$task_id = isset($_GET['task_id']) ? intval($_GET['task_id']) : null;

if (!$task_id) {
    http_response_code(400);
    echo json_encode(['message' => 'ID de tarea requerido.']);
    exit;
}

try {
    // Obtener propuestas de la tarea con información del aplicante
    $stmt = $conn->prepare("
        SELECT 
            a.id,
            a.task_id,
            a.applicant_id,
            a.message,
            a.portfolio_url,
            a.worker_wallet_address,
            a.created_at,
            'pending' as status,
            u.username as applicant_username,
            u.email as applicant_email
        FROM applications a
        JOIN users u ON a.applicant_id = u.id
        WHERE a.task_id = ?
        ORDER BY a.created_at DESC
    ");
    
    $stmt->bind_param("i", $task_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $proposals = [];
    while ($row = $result->fetch_assoc()) {
        $proposals[] = $row;
    }
    
    $stmt->close();
    
    http_response_code(200);
    echo json_encode($proposals, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Error al obtener las propuestas: ' . $e->getMessage()]);
}

$conn->close();
?>