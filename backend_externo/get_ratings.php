<?php
/**
 * get_ratings.php
 * Obtener ratings de un usuario o de una tarea
 * 
 * Parámetros (GET):
 * - user_id: ID del usuario (opcional)
 * - task_id: ID de la tarea (opcional)
 * - page: Página (opcional, default: 1)
 * - limit: Límite por página (opcional, default: 20)
 * 
 * Retorna:
 * - success: boolean
 * - ratings: array de ratings
 * - pagination: { total, page, limit, total_pages }
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
    $_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
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

// Definir la clave secreta (debe coincidir con ARCUSX_JWT_SECRET en config.php)
$secret_key = $jwt_secret;

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
        error_log("JWT Error in get_ratings.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.']);
        exit;
    }

    try {
        // Obtener parámetros
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        $taskId = isset($_GET['task_id']) ? (int)$_GET['task_id'] : 0;
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;
        
        // Construir WHERE clause
        $where = [];
        $bindParams = [];
        $types = '';
        
        if ($userId > 0) {
            $where[] = "r.rated_id = ?";
            $bindParams[] = $userId;
            $types .= 'i';
        }
        
        if ($taskId > 0) {
            $where[] = "r.task_id = ?";
            $bindParams[] = $taskId;
            $types .= 'i';
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // Contar total
        $countSql = "SELECT COUNT(*) as total FROM ratings r $whereClause";
        $countStmt = $conn->prepare($countSql);
        if (!empty($bindParams)) {
            $countStmt->bind_param($types, ...$bindParams);
        }
        $countStmt->execute();
        $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
        $totalPages = ceil($total / $limit);
        
        // Obtener ratings con información del rater y tarea
        $sql = "
            SELECT 
                r.id,
                r.task_id,
                r.rater_id,
                r.rated_id,
                r.rating,
                r.review,
                r.created_at,
                u.username as rater_username,
                t.title as task_title
            FROM ratings r
            LEFT JOIN users u ON r.rater_id = u.id
            LEFT JOIN tasks t ON r.task_id = t.id
            $whereClause
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $conn->prepare($sql);
        $bindParams[] = $limit;
        $bindParams[] = $offset;
        $types .= 'ii';
        
        if (!empty($bindParams)) {
            $stmt->bind_param($types, ...$bindParams);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        $ratings = [];
        while ($row = $result->fetch_assoc()) {
            $ratings[] = [
                'id' => (int)$row['id'],
                'task_id' => (int)$row['task_id'],
                'rater_id' => (int)$row['rater_id'],
                'rated_id' => (int)$row['rated_id'],
                'rating' => (int)$row['rating'],
                'review' => $row['review'],
                'created_at' => $row['created_at'],
                'rater_username' => $row['rater_username'],
                'task_title' => $row['task_title']
            ];
        }
        
        // Si se consulta por usuario, calcular promedio
        $averageRating = null;
        if ($userId > 0) {
            $avgSql = "SELECT AVG(rating) as avg_rating FROM ratings WHERE rated_id = ?";
            $avgStmt = $conn->prepare($avgSql);
            $avgStmt->bind_param("i", $userId);
            $avgStmt->execute();
            $avgResult = $avgStmt->get_result();
            $avgData = $avgResult->fetch_assoc();
            $averageRating = $avgData['avg_rating'] ? round((float)$avgData['avg_rating'], 2) : null;
        }
        
        echo json_encode([
            'success' => true,
            'ratings' => $ratings,
            'average_rating' => $averageRating,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => $totalPages
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("get_ratings.php - EXCEPCIÓN: " . $e->getMessage());
        error_log("get_ratings.php - STACK TRACE: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener ratings: ' . $e->getMessage()
        ]);
    } catch (Error $e) {
        error_log("get_ratings.php - ERROR FATAL: " . $e->getMessage());
        error_log("get_ratings.php - STACK TRACE: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error fatal del servidor: ' . $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}
