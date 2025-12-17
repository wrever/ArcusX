<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
/**
 * Endpoint para solicitar cancelación de una tarea (con supervisión vía disputa)
 * POST /api/auth/request_cancellation.php
 * Headers: Authorization: Bearer {JWT_TOKEN}
 * Body: { "task_id": 123, "reason": "Motivo..." }
 *
 * Este endpoint NO hace reembolso on-chain. Solo:
 * - Crea una disputa "pending" asociada a la tarea
 * - Cambia el estado de la tarea a 'disputed'
 *
 * El frontend debe iniciar la disputa en Trustless Work (startDispute) y el admin debe resolverla (resolveDispute)
 */

require_once 'config.php';

require_once $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function getAuthorizationHeader(): ?string {
    $headers = getallheaders();
    return $headers['Authorization'] ?? $headers['authorization'] ?? null;
}

function getLoggedInUserId(mysqli $conn, string $jwt_secret): ?int {
    $auth = getAuthorizationHeader();
    if (!$auth) return null;
    if (!preg_match('/Bearer\s+(\S+)/', $auth, $m)) return null;
    $jwt = $m[1];

    try {
        $decoded = JWT::decode($jwt, new Key($jwt_secret, 'HS256'));
        if (isset($decoded->data->id)) return (int)$decoded->data->id;
    } catch (Exception $e) {
        error_log("JWT Error en request_cancellation.php: " . $e->getMessage());
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$userId = getLoggedInUserId($conn, $jwt_secret);
if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    $conn->close();
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$taskId = isset($input['task_id']) ? (int)$input['task_id'] : 0;
$reason = isset($input['reason']) ? trim((string)$input['reason']) : '';

if (!$taskId || strlen($reason) < 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'task_id y reason (>=10 caracteres) son requeridos']);
    $conn->close();
    exit;
}

// Obtener tarea (incluye user_id y accepted_applicant_id)
$stmt = $conn->prepare("SELECT id, user_id, accepted_applicant_id, status, escrow_id, escrow_status, client_accepted_completion, worker_accepted_completion FROM tasks WHERE id = ?");
$stmt->bind_param("i", $taskId);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Tarea no encontrada']);
    $stmt->close();
    $conn->close();
    exit;
}
$task = $res->fetch_assoc();
$stmt->close();

// Validar actor
$isClient = ((int)$task['user_id'] === $userId);
$isWorker = ((int)$task['accepted_applicant_id'] === $userId);

if (!$isClient && !$isWorker) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No tienes permisos para solicitar cancelación en esta tarea']);
    $conn->close();
    exit;
}

// Reglas mínimas anti-abuso (las reglas finas se aplican en frontend + admin)
$blocked = ['cancelled', 'resolved'];
if (in_array($task['status'], $blocked, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'La tarea ya está cancelada o resuelta']);
    $conn->close();
    exit;
}

if ($task['status'] === 'completed' || $task['client_accepted_completion'] || $task['worker_accepted_completion']) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No se puede solicitar cancelación: tarea completada o marcada como completada']);
    $conn->close();
    exit;
}

// Verificar que no exista disputa pendiente
$existing = $conn->prepare("SELECT id FROM disputes WHERE task_id = ? AND status = 'pending' LIMIT 1");
$existing->bind_param("i", $taskId);
$existing->execute();
$exRes = $existing->get_result();
if ($exRes->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'Ya existe una disputa pendiente para esta tarea']);
    $existing->close();
    $conn->close();
    exit;
}
$existing->close();

$actorTag = $isClient ? 'CLIENT' : 'WORKER';
$fullReason = "[CANCEL_REQUEST][$actorTag] " . $reason;

// Crear disputa
$create = $conn->prepare("INSERT INTO disputes (task_id, created_by, reason, status) VALUES (?, ?, ?, 'pending')");
$create->bind_param("iis", $taskId, $userId, $fullReason);

if (!$create->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al crear disputa: ' . $conn->error]);
    $create->close();
    $conn->close();
    exit;
}

$disputeId = $create->insert_id;
$create->close();

// Cambiar estado a disputed
$upd = $conn->prepare("UPDATE tasks SET status = 'disputed' WHERE id = ?");
$upd->bind_param("i", $taskId);
$upd->execute();
$upd->close();

echo json_encode([
    'success' => true,
    'message' => 'Solicitud de cancelación creada. Un administrador debe revisar y resolver.',
    'dispute_id' => $disputeId,
    'task' => [
        'id' => $taskId,
        'status' => 'disputed',
        'escrow_id' => $task['escrow_id'],
        'escrow_status' => $task['escrow_status']
    ]
]);

$conn->close();
?>
