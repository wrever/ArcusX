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

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, POST, OPTIONS');
arcusx_cors_apply('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

// Habilitar logs (pero NO mostrar errores en pantalla para evitar output antes de headers)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

require_once 'config.php';
require_once 'vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = arcusx_jwt_user_id();

    if ($loggedInUserId === null) {
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
