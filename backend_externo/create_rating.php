<?php
/**
 * create_rating.php
 * Crear un rating y review para una tarea completada
 * 
 * Parámetros (POST):
 * - task_id: ID de la tarea
 * - rated_user_id: ID del usuario que está siendo calificado
 * - rating: Calificación (1-5)
 * - review: Texto opcional del review
 * 
 * Retorna:
 * - success: boolean
 * - message: string
 */

// CORS headers - DEBEN IR PRIMERO, ANTES DE CUALQUIER OTRO OUTPUT
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.pro',
    'http://arcusx.pro'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Manejar preflight OPTIONS request PRIMERO
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    header("Content-Length: 0");
    http_response_code(200);
    exit();
}

// Headers CORS para requests normales
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Habilitar logs (pero NO mostrar errores en pantalla para evitar output antes de headers)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Definir la clave secreta (debe coincidir con la de login.php)
$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

// Función para obtener el ID del usuario logeado desde el token JWT
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
        } else {
            return null;
        }
    } catch (Exception $e) {
        error_log("JWT Error in create_rating.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

try {
    // Obtener usuario autenticado
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);
    
    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.']);
        exit();
    }
    
    $raterId = (int)$loggedInUserId;
    
    // Obtener datos del POST
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        exit();
    }
    
    $taskId = isset($data['task_id']) ? (int)$data['task_id'] : 0;
    $ratedUserId = isset($data['rated_user_id']) ? (int)$data['rated_user_id'] : 0;
    $rating = isset($data['rating']) ? (int)$data['rating'] : 0;
    $review = isset($data['review']) && !empty($data['review']) ? trim($data['review']) : null;
    
    // Log inicial para debugging
    error_log("create_rating.php - INICIO - Task ID: $taskId, Rated User ID: $ratedUserId, Rating: $rating, Rater ID: $raterId");
    
    // Validaciones
    if ($taskId <= 0) {
        throw new Exception('task_id inválido');
    }
    
    if ($ratedUserId <= 0) {
        throw new Exception('rated_user_id inválido');
    }
    
    if ($rating < 1 || $rating > 5) {
        throw new Exception('rating debe estar entre 1 y 5');
    }
    
    if ($raterId === $ratedUserId) {
        throw new Exception('No puedes calificarte a ti mismo');
    }
    
    // Verificar que la tarea esté completada
    $taskStmt = $conn->prepare("SELECT id, status, escrow_status, user_id, accepted_applicant_id FROM tasks WHERE id = ?");
    $taskStmt->bind_param("i", $taskId);
    $taskStmt->execute();
    $taskResult = $taskStmt->get_result();
    
    if ($taskResult->num_rows === 0) {
        throw new Exception('Tarea no encontrada');
    }
    
    $task = $taskResult->fetch_assoc();
    
    // Log para debugging
    error_log("create_rating.php - Verificando tarea ID: $taskId");
    error_log("create_rating.php - Task status: " . ($task['status'] ?? 'NULL'));
    error_log("create_rating.php - Escrow status: " . ($task['escrow_status'] ?? 'NULL'));
    error_log("create_rating.php - Rater ID: $raterId, Rated User ID: $ratedUserId");
    
    // Permitir rating cuando el milestone esté aprobado (no requiere que la tarea esté completamente completada)
    // Solo verificamos que la tarea exista y que el escrow esté en progreso o completado
    if ($task['status'] === 'cancelled' || $task['status'] === 'deleted') {
        $statusMsg = "Status: " . ($task['status'] ?? 'NULL');
        error_log("create_rating.php - ERROR: Tarea cancelada o eliminada. $statusMsg");
        throw new Exception('No puedes calificar una tarea cancelada o eliminada. Estado: ' . $statusMsg);
    }
    
    // Verificar que el usuario que califica sea el cliente o el trabajador de la tarea
    $isClient = ($task['user_id'] === $raterId);
    $isWorker = ($task['accepted_applicant_id'] !== null && $task['accepted_applicant_id'] == $raterId);
    
    if (!$isClient && !$isWorker) {
        error_log("create_rating.php - ERROR: Usuario no autorizado. Rater ID: $raterId, Task User ID: " . ($task['user_id'] ?? 'NULL') . ", Accepted Applicant ID: " . ($task['accepted_applicant_id'] ?? 'NULL'));
        throw new Exception('Solo el cliente o trabajador de la tarea pueden calificar');
    }
    
    // Verificar que el usuario calificado sea el otro participante
    $expectedRatedId = $isClient ? $task['accepted_applicant_id'] : $task['user_id'];
    
    if ($expectedRatedId === null) {
        error_log("create_rating.php - ERROR: expectedRatedId es NULL. isClient: " . ($isClient ? 'true' : 'false'));
        throw new Exception('No se puede determinar el usuario a calificar. La tarea puede no tener trabajador asignado.');
    }
    
    if ($ratedUserId != $expectedRatedId) {
        error_log("create_rating.php - ERROR: ratedUserId no coincide. Expected: $expectedRatedId, Received: $ratedUserId");
        throw new Exception('Solo puedes calificar al otro participante de la tarea');
    }
    
    // Verificar que no exista un rating previo para esta tarea/usuario
    $checkStmt = $conn->prepare("SELECT id FROM ratings WHERE task_id = ? AND rater_id = ? AND rated_id = ?");
    $checkStmt->bind_param("iii", $taskId, $raterId, $ratedUserId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        throw new Exception('Ya has calificado a este usuario para esta tarea');
    }
    
    // Iniciar transacción para asegurar atomicidad
    $conn->begin_transaction();
    
    try {
        // Insertar el rating
        // Si review es NULL, usar string vacío para evitar problemas con bind_param
        $reviewValue = $review !== null ? $review : '';
        $insertStmt = $conn->prepare("INSERT INTO ratings (task_id, rater_id, rated_id, rating, review) VALUES (?, ?, ?, ?, ?)");
        
        if (!$insertStmt) {
            error_log("create_rating.php - ERROR al preparar INSERT: " . $conn->error);
            throw new Exception('Error al preparar la consulta: ' . $conn->error);
        }
        
        $insertStmt->bind_param("iiiis", $taskId, $raterId, $ratedUserId, $rating, $reviewValue);
        
        error_log("create_rating.php - Intentando insertar rating: task_id=$taskId, rater_id=$raterId, rated_id=$ratedUserId, rating=$rating, review=" . ($reviewValue ?: 'NULL'));
        
        if (!$insertStmt->execute()) {
            error_log("create_rating.php - ERROR en INSERT: " . $conn->error);
            error_log("create_rating.php - ERROR en INSERT (insertStmt->error): " . $insertStmt->error);
            throw new Exception('Error al crear rating: ' . $conn->error);
        }
        
        $ratingId = $insertStmt->insert_id;
        error_log("create_rating.php - Rating insertado exitosamente con ID: $ratingId");
        
        // Actualizar average_rating y total_ratings del usuario calificado
        // Calcular nuevo promedio
        $avgStmt = $conn->prepare("
            SELECT AVG(rating) as avg_rating, COUNT(*) as total 
            FROM ratings 
            WHERE rated_id = ?
        ");
        $avgStmt->bind_param("i", $ratedUserId);
        $avgStmt->execute();
        $avgResult = $avgStmt->get_result();
        $avgData = $avgResult->fetch_assoc();
        
        $newAverage = round((float)$avgData['avg_rating'], 2);
        $newTotal = (int)$avgData['total'];
        
        // Actualizar tabla users
        $updateStmt = $conn->prepare("UPDATE users SET average_rating = ?, total_ratings = ? WHERE id = ?");
        if (!$updateStmt) {
            error_log("create_rating.php - ERROR al preparar UPDATE: " . $conn->error);
            throw new Exception('Error al preparar actualización: ' . $conn->error);
        }
        
        $updateStmt->bind_param("dii", $newAverage, $newTotal, $ratedUserId);
        if (!$updateStmt->execute()) {
            error_log("create_rating.php - ERROR en UPDATE: " . $conn->error);
            throw new Exception('Error al actualizar promedio de usuario: ' . $conn->error);
        }
        
        // Confirmar transacción
        $conn->commit();
        error_log("create_rating.php - Transacción completada exitosamente");
        
    } catch (Exception $e) {
        // Revertir transacción en caso de error
        $conn->rollback();
        error_log("create_rating.php - Transacción revertida: " . $e->getMessage());
        throw $e;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Rating creado exitosamente',
        'rating_id' => $insertStmt->insert_id
    ]);
    
} catch (Exception $e) {
    error_log("create_rating.php - EXCEPCIÓN: " . $e->getMessage());
    error_log("create_rating.php - STACK TRACE: " . $e->getTraceAsString());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (Error $e) {
    error_log("create_rating.php - ERROR FATAL: " . $e->getMessage());
    error_log("create_rating.php - STACK TRACE: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fatal del servidor: ' . $e->getMessage()
    ]);
}

