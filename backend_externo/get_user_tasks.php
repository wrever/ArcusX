<?php
require_once __DIR__ . '/config.php';

// Corregir mojibake (tildes y ñ)
function fix_utf8_mojibake($str) {
    if (!is_string($str) || $str === '') return $str;
    $bytes = @mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    if ($bytes === false) return $str;
    if (!mb_check_encoding($bytes, 'UTF-8')) return $str;
    return $bytes;
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");


// Asegurarse de que la solicitud es GET y que se recibe el user_id
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener el user_id de la solicitud GET
    if (!isset($_GET['user_id'])) {
        http_response_code(400); // Bad Request
        echo json_encode(['message' => 'Falta el ID del usuario.']);
        exit;
    }

    $userId = intval($_GET['user_id']);

    // Opcional: Verificar si el user_id existe en la tabla users
    $check_user = $conn->query("SELECT id FROM users WHERE id = $userId");
    if ($check_user === false) { // Check for query errors
         http_response_code(500);
         echo json_encode(['message' => 'Error al verificar usuario: ' . $conn->error]);
         exit;
    }
    if ($check_user->num_rows === 0) {
        http_response_code(404); // Not Found
        echo json_encode(['message' => 'Usuario no encontrado.']);
        exit;
    }

    // Preparar la consulta SQL para obtener las tareas del usuario, el recuento de propuestas
    // Y un indicador de si existe una propuesta aceptada
    $sql = "SELECT
                t.id,
                t.title,
                t.subtitle,
                t.price,
                t.currency,
                t.difficulty,
                t.category,
                u.username AS creator_username, -- Obtener el nombre del usuario creador
                t.created_at,
                COUNT(a.id) AS proposal_count, -- Contar el número de propuestas
                MAX(CASE WHEN a.status = 'accepted' THEN 1 ELSE 0 END) AS has_accepted_proposal, -- Indicador si hay alguna propuesta aceptada
                (SELECT ap.applicant_id FROM applications ap WHERE ap.task_id = t.id AND ap.status = 'accepted' LIMIT 1) AS accepted_applicant_id -- Obtener el ID del aplicante aceptado (si existe)
            FROM
                tasks t
            JOIN
                users u ON t.user_id = u.id
            LEFT JOIN
                applications a ON t.id = a.task_id -- Usar la tabla applications y su columna task_id
            WHERE
                t.user_id = $userId -- Filtrar por el ID del usuario logeado
            GROUP BY
                t.id -- Agrupar por tarea para el conteo y el MAX
            ORDER BY
                t.created_at DESC"; // Opcional: ordenar por fecha de creación

    $result = $conn->query($sql);

    if ($result === false) { // Check for query errors
         http_response_code(500);
         echo json_encode(['message' => 'Error al obtener tareas del usuario: ' . $conn->error]);
         exit;
    }

    $tasks = [];
    $textKeys = ['title', 'subtitle', 'category', 'difficulty', 'currency', 'creator_username'];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $row['has_accepted_proposal'] = (bool)$row['has_accepted_proposal'];
            foreach ($textKeys as $k) {
                if (isset($row[$k]) && is_string($row[$k])) $row[$k] = fix_utf8_mojibake($row[$k]);
            }
            $tasks[] = $row;
        }
    }

    $json = json_encode($tasks, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        $json = '[]';
        if (function_exists('error_log')) {
            error_log('get_user_tasks.php json_encode error: ' . json_last_error_msg());
        }
    }
    http_response_code(200);
    header('Content-Length: ' . strlen($json));
    echo $json;

    $conn->close();

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}
?>