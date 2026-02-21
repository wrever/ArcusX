<?php
/**
 * get_dispute_files.php
 * Endpoint para obtener todos los archivos relacionados con una disputa
 * Solo accesible para administradores
 * GET /api/auth/get_dispute_files.php?dispute_id=123
 * Headers: Authorization: Bearer {JWT_TOKEN}
 */

require_once 'config.php';

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).'
    ]);
    exit();
}
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
            error_log("JWT Error en get_dispute_files.php: " . $e->getMessage());
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

// Función para obtener tamaño de archivo en formato legible
function formatFileSize($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}

// Función para obtener tipo MIME desde extensión
function getMimeType($filename) {
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $mimeTypes = [
        'pdf' => 'application/pdf',
        'zip' => 'application/zip',
        'rar' => 'application/x-rar-compressed',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'txt' => 'text/plain',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls' => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return $mimeTypes[$extension] ?? 'application/octet-stream';
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
        $disputeStmt = $conn->prepare("SELECT id, task_id FROM disputes WHERE id = ?");
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
        
        // Obtener información de la tarea
        $taskStmt = $conn->prepare("
            SELECT 
                t.user_id as client_id,
                t.accepted_applicant_id as worker_id,
                t.files as task_files_json
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
        $workerId = $task['accepted_applicant_id'];
        $taskStmt->close();
        
        // Verificar permisos: admin, cliente o trabajador pueden ver los archivos
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
    
    $files = [
        'task_files' => [],
        'chat_files' => [],
        'delivery_files' => []
    ];
    
    // 1. Archivos de la tarea (iniciales)
    if (!empty($task['task_files_json'])) {
        $taskFilesData = json_decode($task['task_files_json'], true);
        if (is_array($taskFilesData)) {
            foreach ($taskFilesData as $index => $fileData) {
                $filename = is_array($fileData) ? ($fileData['name'] ?? $fileData['filename'] ?? "archivo_$index") : $fileData;
                $fileUrl = is_array($fileData) ? ($fileData['url'] ?? $fileData['path'] ?? '') : '';
                
                // Construir URL completa si es relativa
                if (!empty($fileUrl) && !filter_var($fileUrl, FILTER_VALIDATE_URL)) {
                    $fileUrl = '/uploads/tasks/' . $taskId . '/' . basename($fileUrl);
                }
                
                $files['task_files'][] = [
                    'id' => $index + 1,
                    'filename' => $filename,
                    'url' => $fileUrl,
                    'type' => getMimeType($filename),
                    'size' => is_array($fileData) && isset($fileData['size']) ? $fileData['size'] : 0,
                    'size_formatted' => is_array($fileData) && isset($fileData['size']) ? formatFileSize($fileData['size']) : 'N/A',
                    'uploaded_at' => is_array($fileData) && isset($fileData['uploaded_at']) ? $fileData['uploaded_at'] : null,
                    'uploaded_by' => 'client'
                ];
            }
        }
    }
    
    // 2. Archivos compartidos en el chat
    // NOTA: La tabla messages no tiene columna files, así que no hay archivos en el chat
    // Si en el futuro se agrega esta funcionalidad, se puede descomentar este código
    // Por ahora, $files['chat_files'] permanece vacío
    
        // 3. Archivos de entregas (si hay una tabla de entregas, sino usar archivos del chat marcados como entregas)
        // Por ahora, consideramos archivos del chat como entregas si el trabajador los envió después de marcar como completado
        // Esto se puede mejorar cuando haya una tabla específica de entregas
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'files' => $files,
            'summary' => [
                'total_files' => count($files['task_files']) + count($files['chat_files']) + count($files['delivery_files']),
                'task_files_count' => count($files['task_files']),
                'chat_files_count' => count($files['chat_files']),
                'delivery_files_count' => count($files['delivery_files'])
            ]
        ]);
        
        $conn->close();
    } catch (Exception $e) {
        error_log('Error en get_dispute_files.php: ' . $e->getMessage());
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
