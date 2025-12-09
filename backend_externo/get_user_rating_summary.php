<?php
/**
 * get_user_rating_summary.php
 * Obtener resumen de ratings de un usuario
 * 
 * Parámetros (GET):
 * - user_id: ID del usuario (opcional, usa el usuario del token si no se proporciona)
 * 
 * Retorna:
 * - success: boolean
 * - average_rating: número (promedio de ratings)
 * - total_ratings: número (total de ratings recibidos)
 * - rating_distribution: array con distribución de ratings (1-5)
 */

require_once 'admin_common.php';

header('Content-Type: application/json');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Obtener conexión y usuario
    $conn = getDatabaseConnection();
    $user = getCurrentUser($conn);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit();
    }
    
    // Obtener user_id (del token o parámetro)
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : $user['id'];
    
    // Solo permitir que un usuario vea sus propios datos (a menos que sea admin)
    if ($userId !== $user['id'] && !$user['is_admin']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No tienes permiso para ver estos datos']);
        exit();
    }
    
    // Obtener promedio y total de ratings
    $summaryStmt = $conn->prepare("
        SELECT 
            AVG(rating) as average_rating,
            COUNT(*) as total_ratings
        FROM ratings
        WHERE rated_id = ?
    ");
    $summaryStmt->bind_param("i", $userId);
    $summaryStmt->execute();
    $summaryResult = $summaryStmt->get_result();
    $summaryData = $summaryResult->fetch_assoc();
    
    $averageRating = $summaryData['average_rating'] ? round((float)$summaryData['average_rating'], 2) : 0.00;
    $totalRatings = (int)$summaryData['total_ratings'];
    
    // Obtener distribución de ratings (cuántos 5, 4, 3, 2, 1)
    $distStmt = $conn->prepare("
        SELECT 
            rating,
            COUNT(*) as count
        FROM ratings
        WHERE rated_id = ?
        GROUP BY rating
        ORDER BY rating DESC
    ");
    $distStmt->bind_param("i", $userId);
    $distStmt->execute();
    $distResult = $distStmt->get_result();
    
    $distribution = [
        '5' => 0,
        '4' => 0,
        '3' => 0,
        '2' => 0,
        '1' => 0
    ];
    
    while ($row = $distResult->fetch_assoc()) {
        $distribution[(string)$row['rating']] = (int)$row['count'];
    }
    
    // Obtener también desde la tabla users (puede estar más actualizado)
    $userStmt = $conn->prepare("SELECT average_rating, total_ratings FROM users WHERE id = ?");
    $userStmt->bind_param("i", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    if ($userRow = $userResult->fetch_assoc()) {
        // Usar los valores de la tabla users si están disponibles
        if ($userRow['average_rating'] !== null) {
            $averageRating = round((float)$userRow['average_rating'], 2);
        }
        if ($userRow['total_ratings'] !== null) {
            $totalRatings = (int)$userRow['total_ratings'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'average_rating' => $averageRating,
        'total_ratings' => $totalRatings,
        'rating_distribution' => $distribution
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener resumen de ratings: ' . $e->getMessage()
    ]);
}

