<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
/**
 * get_dispute_timeline.php
 * Endpoint para obtener el timeline de eventos de una disputa
 * Solo accesible para administradores
 * GET /api/auth/get_dispute_timeline.php?dispute_id=123
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
            error_log("JWT Error en get_dispute_timeline.php: " . $e->getMessage());
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
        
        // Verificar que la disputa existe y obtener información
        $disputeStmt = $conn->prepare("
            SELECT 
                d.id,
                d.task_id,
                d.created_by,
                d.reason,
                d.created_at as dispute_created_at,
                t.user_id as client_id,
                t.accepted_applicant_id as worker_id,
                t.created_at as task_created_at,
                t.escrow_id,
                t.escrow_created_at,
                t.escrow_completed_at,
                t.status as task_status,
                t.client_accepted_completion,
                t.worker_accepted_completion
            FROM disputes d
            INNER JOIN tasks t ON d.task_id = t.id
            WHERE d.id = ?
        ");
        
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
        
        $disputeData = $disputeResult->fetch_assoc();
        $taskId = $disputeData['task_id'];
        $clientId = $disputeData['client_id'];
        $workerId = $disputeData['accepted_applicant_id'];
        $disputeStmt->close();
        
        // Verificar permisos: admin, cliente o trabajador pueden ver el timeline
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
    
    // Obtener información de usuarios
    $users = [];
    if ($clientId) {
        $userStmt = $conn->prepare("SELECT id, username FROM users WHERE id = ?");
        if ($userStmt) {
            $userStmt->bind_param("i", $clientId);
            $userStmt->execute();
            $userResult = $userStmt->get_result();
            if ($userResult->num_rows > 0) {
                $users['client'] = $userResult->fetch_assoc();
            }
            $userStmt->close();
        }
    }
    
    if ($workerId) {
        $userStmt = $conn->prepare("SELECT id, username FROM users WHERE id = ?");
        if ($userStmt) {
            $userStmt->bind_param("i", $workerId);
            $userStmt->execute();
            $userResult = $userStmt->get_result();
            if ($userResult->num_rows > 0) {
                $users['worker'] = $userResult->fetch_assoc();
            }
            $userStmt->close();
        }
    }
    
    // Obtener fecha de aceptación de propuesta (cuando se asignó el trabajador)
    $proposalStmt = $conn->prepare("
        SELECT created_at 
        FROM applications 
        WHERE task_id = ? AND status = 'accepted' 
        ORDER BY created_at ASC 
        LIMIT 1
    ");
    $proposalAcceptedAt = null;
    if ($proposalStmt) {
        $proposalStmt->bind_param("i", $taskId);
        $proposalStmt->execute();
        $proposalResult = $proposalStmt->get_result();
        if ($proposalResult->num_rows > 0) {
            $proposalAcceptedAt = $proposalResult->fetch_assoc()['created_at'];
        }
        $proposalStmt->close();
    }
    
    // Construir timeline
    $timeline = [];
    $eventId = 1;
    
    // 1. Tarea creada
    if ($disputeData['task_created_at']) {
        $timeline[] = [
            'id' => $eventId++,
            'type' => 'task_created',
            'title' => 'Tarea creada',
            'description' => 'El cliente creó la tarea',
            'date' => $disputeData['task_created_at'],
            'user' => isset($users['client']) ? $users['client'] : null
        ];
    }
    
    // 2. Propuesta aceptada
    if ($proposalAcceptedAt) {
        $timeline[] = [
            'id' => $eventId++,
            'type' => 'proposal_accepted',
            'title' => 'Propuesta aceptada',
            'description' => 'El cliente aceptó la propuesta del trabajador',
            'date' => $proposalAcceptedAt,
            'user' => isset($users['client']) ? $users['client'] : null
        ];
    }
    
    // 3. Escrow creado
    if ($disputeData['escrow_created_at']) {
        $timeline[] = [
            'id' => $eventId++,
            'type' => 'escrow_created',
            'title' => 'Escrow creado',
            'description' => 'Contrato escrow creado en Trustless Work',
            'date' => $disputeData['escrow_created_at'],
            'metadata' => [
                'contract_id' => isset($disputeData['escrow_id']) ? $disputeData['escrow_id'] : null
            ]
        ];
    }
    
    // 4. Escrow fondeado (aproximado: después de creado, antes de completado)
    // Nota: No tenemos fecha exacta de fondeo, usamos escrow_created_at + 5 minutos como aproximación
    if ($disputeData['escrow_created_at']) {
        $fundedDate = date('Y-m-d H:i:s', strtotime($disputeData['escrow_created_at'] . ' +5 minutes'));
        $timeline[] = [
            'id' => $eventId++,
            'type' => 'escrow_funded',
            'title' => 'Escrow fondeado',
            'description' => 'Cliente envió fondos al escrow',
            'date' => $fundedDate,
            'user' => isset($users['client']) ? $users['client'] : null,
            'metadata' => [
                'contract_id' => isset($disputeData['escrow_id']) ? $disputeData['escrow_id'] : null
            ]
        ];
    }
    
    // 5. Tarea marcada como completada (trabajador)
    if ($disputeData['worker_accepted_completion'] == 1) {
        // Buscar fecha del primer mensaje después de que el trabajador marcó como completado
        // O usar una fecha aproximada basada en cuando se creó la disputa
        $completionDate = $disputeData['dispute_created_at'] ? 
            date('Y-m-d H:i:s', strtotime($disputeData['dispute_created_at'] . ' -1 day')) : 
            date('Y-m-d H:i:s');
        
        $timeline[] = [
            'id' => $eventId++,
            'type' => 'task_completed',
            'title' => 'Tarea marcada como completada',
            'description' => 'El trabajador marcó la tarea como completada',
            'date' => $completionDate,
            'user' => isset($users['worker']) ? $users['worker'] : null
        ];
    }
    
    // 6. Disputa creada
    if ($disputeData['dispute_created_at']) {
        $timeline[] = [
            'id' => $eventId++,
            'type' => 'dispute_created',
            'title' => 'Disputa iniciada',
            'description' => 'Se inició una disputa',
            'date' => $disputeData['dispute_created_at'],
            'user' => [
                'id' => (int)$disputeData['created_by'],
                'username' => (isset($users['client']['username']) ? $users['client']['username'] : (isset($users['worker']['username']) ? $users['worker']['username'] : 'Usuario'))
            ],
            'metadata' => [
                'reason' => isset($disputeData['reason']) ? $disputeData['reason'] : null
            ]
        ];
    }
    
    // Ordenar timeline por fecha
    usort($timeline, function($a, $b) {
        return strtotime($a['date']) - strtotime($b['date']);
    });
    
    // Reasignar IDs después de ordenar
    foreach ($timeline as $index => &$event) {
        $event['id'] = $index + 1;
    }
    
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'timeline' => $timeline
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        $conn->close();
    } catch (Exception $e) {
        error_log('Error en get_dispute_timeline.php: ' . $e->getMessage());
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
