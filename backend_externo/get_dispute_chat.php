<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
/**
 * get_dispute_chat.php
 * Endpoint para obtener el chat completo entre cliente y trabajador de una disputa
 * Solo accesible para administradores
 * GET /api/auth/get_dispute_chat.php?dispute_id=123
 * Headers: Authorization: Bearer {JWT_TOKEN}
 */

require_once 'config.php';

require $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

/**
 * Obtener el ID del usuario autenticado desde el JWT
 */
function getLoggedInUserId($secret_key) {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    // También verificar $_SERVER por si getallheaders() no funciona
    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        try {
            JWT::$leeway = 300;
            $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
            if (isset($decoded->data->id)) {
                return (int)$decoded->data->id;
            }
        } catch (Exception $e) {
            error_log("JWT Error en get_dispute_chat.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

/**
 * Verificar si el usuario es administrador
 */
function isAdmin($conn, $userId) {
    if (!$userId) {
        return false;
    }
    
    $stmt = $conn->prepare("SELECT is_admin FROM users WHERE id = ?");
    if (!$stmt) {
        error_log("Error preparando consulta isAdmin: " . $conn->error);
        return false;
    }
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        return false;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    return isset($user['is_admin']) && $user['is_admin'] == 1;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $userId = getLoggedInUserId($jwt_secret);
        
        if (!$userId) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'
            ]);
            $conn->close();
            exit;
        }
        
        // Obtener dispute_id de los parámetros
        $disputeId = isset($_GET['dispute_id']) ? intval($_GET['dispute_id']) : null;
        
        if (!$disputeId || $disputeId <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'dispute_id es requerido y debe ser un número válido'
            ]);
            $conn->close();
            exit;
        }
        
        // Verificar que la disputa existe y obtener task_id
        $disputeStmt = $conn->prepare("SELECT id, task_id, created_by FROM disputes WHERE id = ?");
        if (!$disputeStmt) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al preparar consulta: ' . $conn->error
            ]);
            $conn->close();
            exit;
        }
        
        $disputeStmt->bind_param("i", $disputeId);
        $disputeStmt->execute();
        $disputeResult = $disputeStmt->get_result();
        
        if ($disputeResult->num_rows === 0) {
            $disputeStmt->close();
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Disputa no encontrada'
            ]);
            $conn->close();
            exit;
        }
        
        $dispute = $disputeResult->fetch_assoc();
        $taskId = $dispute['task_id'];
        $disputeStmt->close();
        
        // Obtener información de la tarea para identificar cliente y trabajador
        $taskStmt = $conn->prepare("
            SELECT 
                t.user_id as client_id,
                t.accepted_applicant_id as worker_id
            FROM tasks t
            WHERE t.id = ?
        ");
        if (!$taskStmt) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al preparar consulta de tarea: ' . $conn->error
            ]);
            $conn->close();
            exit;
        }
        
        $taskStmt->bind_param("i", $taskId);
        $taskStmt->execute();
        $taskResult = $taskStmt->get_result();
        
        if ($taskResult->num_rows === 0) {
            $taskStmt->close();
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Tarea asociada a la disputa no encontrada'
            ]);
            $conn->close();
            exit;
        }
        
        $task = $taskResult->fetch_assoc();
        $clientId = $task['client_id'];
        $workerId = $task['worker_id'];
        $taskStmt->close();
        
        // Verificar permisos: admin, cliente o trabajador pueden ver el chat
        $isAdmin = isAdmin($conn, $userId);
        $isClient = ($clientId && $userId == $clientId);
        $isWorker = ($workerId && $userId == $workerId);
        
        if (!$isAdmin && !$isClient && !$isWorker) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Acceso denegado. Solo administradores, el cliente o el trabajador pueden acceder a este endpoint.'
            ]);
            $conn->close();
            exit;
        }
    
    // Obtener información de los participantes
    $participants = [];
    
    if ($clientId) {
        $clientStmt = $conn->prepare("SELECT id, username, email FROM users WHERE id = ?");
        if ($clientStmt) {
            $clientStmt->bind_param("i", $clientId);
            $clientStmt->execute();
            $clientResult = $clientStmt->get_result();
            if ($clientResult->num_rows > 0) {
                $participants['client'] = $clientResult->fetch_assoc();
            }
            $clientStmt->close();
        }
    }
    
    if ($workerId) {
        $workerStmt = $conn->prepare("SELECT id, username, email FROM users WHERE id = ?");
        if ($workerStmt) {
            $workerStmt->bind_param("i", $workerId);
            $workerStmt->execute();
            $workerResult = $workerStmt->get_result();
            if ($workerResult->num_rows > 0) {
                $participants['worker'] = $workerResult->fetch_assoc();
            }
            $workerStmt->close();
        }
    }
    
    // Obtener mensajes del chat
    $messagesStmt = $conn->prepare("
        SELECT 
            m.id,
            m.sender_id,
            u1.username as sender_username,
            m.receiver_id,
            u2.username as receiver_username,
            m.message,
            m.created_at
        FROM messages m
        LEFT JOIN users u1 ON m.sender_id = u1.id
        LEFT JOIN users u2 ON m.receiver_id = u2.id
        WHERE m.task_id = ?
        ORDER BY m.created_at ASC
    ");
    
    if (!$messagesStmt) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al preparar consulta de mensajes: ' . $conn->error
        ]);
        $conn->close();
        exit;
    }
    
    $messagesStmt->bind_param("i", $taskId);
    $messagesStmt->execute();
    $messagesResult = $messagesStmt->get_result();
    
    $messages = [];
    while ($row = $messagesResult->fetch_assoc()) {
        // La tabla messages no tiene columna files, así que siempre devolvemos array vacío
        $messages[] = [
            'id' => (int)$row['id'],
            'sender_id' => (int)$row['sender_id'],
            'sender_username' => isset($row['sender_username']) ? $row['sender_username'] : 'Usuario desconocido',
            'receiver_id' => (int)$row['receiver_id'],
            'receiver_username' => isset($row['receiver_username']) ? $row['receiver_username'] : 'Usuario desconocido',
            'message' => $row['message'],
            'created_at' => $row['created_at'],
            'files' => [] // La tabla messages no tiene columna files
        ];
    }
    $messagesStmt->close();
        
        // Calcular estadísticas
        $totalMessages = count($messages);
        $clientMessages = 0;
        $workerMessages = 0;
        $filesCount = 0;
        
        foreach ($messages as $msg) {
            if ($msg['sender_id'] == $clientId) {
                $clientMessages++;
            } elseif ($msg['sender_id'] == $workerId) {
                $workerMessages++;
            }
            $filesCount += count($msg['files']);
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'messages' => $messages,
            'participants' => $participants,
            'stats' => [
                'total_messages' => $totalMessages,
                'client_messages' => $clientMessages,
                'worker_messages' => $workerMessages,
                'files_shared' => $filesCount
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        $conn->close();
    } catch (Exception $e) {
        error_log('Error en get_dispute_chat.php: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error interno del servidor: ' . $e->getMessage()
        ]);
        if (isset($conn)) {
            $conn->close();
        }
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
    if (isset($conn)) {
        $conn->close();
    }
}
?>
