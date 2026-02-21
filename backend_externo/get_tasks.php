<?php
/**
 * get_tasks.php
 * 
 * NOTA: El campo 'price' en la respuesta representa el monto que recibirá el trabajador (workerAmount).
 * El frontend interpreta este valor como el pago exacto que recibirá el trabajador.
 */
// Deshabilitar display_errors para evitar output antes de headers
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

// Iniciar output buffering para capturar cualquier output inesperado
ob_start();

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
    // Limpiar cualquier output previo
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit();
}

// Headers CORS para requests normales
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Limpiar buffer antes de require
ob_end_clean();

try {
    // __DIR__ asegura cargar el config de la misma carpeta que este script (api/auth en producción)
    require_once __DIR__ . '/config.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Error de conexión a la base de datos'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Corregir mojibake: datos que se guardaron como Latin-1 pero son bytes UTF-8 (ej. programaciÃ³n → programación)
function fix_utf8_mojibake($str) {
    if (!is_string($str) || $str === '') return $str;
    $bytes = @mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    if ($bytes === false) return $str;
    if (!mb_check_encoding($bytes, 'UTF-8')) return $str;
    return $bytes;
}

// Asegurarse de que la solicitud es GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // Obtener parámetros de búsqueda y filtros
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $minPrice = isset($_GET['min_price']) ? (float)$_GET['min_price'] : null;
    $maxPrice = isset($_GET['max_price']) ? (float)$_GET['max_price'] : null;
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';
    $difficulty = isset($_GET['difficulty']) ? trim($_GET['difficulty']) : '';
    $sortBy = isset($_GET['sort_by']) ? trim($_GET['sort_by']) : 'date_desc';

    // Construir la consulta SQL base
    $where = [];
    $bindParams = [];
    $types = '';

    // Condiciones base: mismas que get_public_stats (status literal para evitar diferencias por servidor)
    $where[] = "(t.accepted_applicant_id IS NULL OR t.accepted_applicant_id = 0)";
    $where[] = "t.status = 'open'";

    // Búsqueda por texto (título o descripción)
    if (!empty($search)) {
        $where[] = "(t.title LIKE ? OR t.description LIKE ?)";
        $searchParam = "%$search%";
        $bindParams[] = $searchParam;
        $bindParams[] = $searchParam;
        $types .= 'ss';
    }

    // Filtro por precio mínimo
    if ($minPrice !== null && $minPrice > 0) {
        $where[] = "t.price >= ?";
        $bindParams[] = $minPrice;
        $types .= 'd';
    }

    // Filtro por precio máximo
    if ($maxPrice !== null && $maxPrice > 0) {
        $where[] = "t.price <= ?";
        $bindParams[] = $maxPrice;
        $types .= 'd';
    }

    // Filtro por categoría
    if (!empty($category) && $category !== 'all') {
        $where[] = "LOWER(t.category) = LOWER(?)";
        $bindParams[] = $category;
        $types .= 's';
    }

    // Filtro por dificultad
    if (!empty($difficulty) && $difficulty !== 'all') {
        $where[] = "LOWER(t.difficulty) = LOWER(?)";
        $bindParams[] = $difficulty;
        $types .= 's';
    }

    $whereClause = 'WHERE ' . implode(' AND ', $where);

    // Construir ORDER BY según sort_by
    $orderBy = "t.created_at DESC"; // Por defecto: más recientes primero
    switch ($sortBy) {
        case 'price_asc':
            $orderBy = "t.price ASC";
            break;
        case 'price_desc':
            $orderBy = "t.price DESC";
            break;
        case 'date_asc':
            $orderBy = "t.created_at ASC";
            break;
        case 'date_desc':
            $orderBy = "t.created_at DESC";
            break;
        case 'popularity':
            $orderBy = "t.created_at DESC";
            break;
    }

    // Consulta sin subquery a applications (evita fallos si la tabla no existe o hay restricciones)
    $sql = "SELECT
            t.id,
            t.title,
            t.subtitle,
            t.description,
            t.price,
            t.currency,
            t.difficulty,
            t.category,
            IFNULL(u.username, '') AS creator_username,
            u.id AS creator_id,
            u.average_rating AS creator_rating,
            u.total_ratings AS creator_total_ratings,
            t.created_at,
            t.status,
            0 AS proposal_count
        FROM
            tasks t
        LEFT JOIN
            users u ON t.user_id = u.id
        $whereClause
        ORDER BY
            $orderBy";

    // Ejecutar consulta con prepared statements si hay parámetros
    if (!empty($bindParams)) {
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param($types, ...$bindParams);
            $stmt->execute();
            // get_result() requiere mysqlnd; sin él hace fatal en PHP 8.2 → respuesta vacía
            if (!method_exists($stmt, 'get_result')) {
                http_response_code(500);
                $j = json_encode(['message' => 'Servidor requiere mysqlnd para filtros. Recarga sin filtros.']);
                header('Content-Length: ' . strlen($j));
                echo $j;
                $stmt->close();
                $conn->close();
                exit;
            }
            $result = $stmt->get_result();
            if ($result === false) {
                http_response_code(500);
                $j = json_encode(['message' => 'Error al obtener resultados.']);
                header('Content-Length: ' . strlen($j));
                echo $j;
                $stmt->close();
                $conn->close();
                exit;
            }
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'Error al preparar consulta: ' . $conn->error, 'sql_error' => $conn->error], JSON_UNESCAPED_UNICODE);
            if (isset($stmt)) {
                $stmt->close();
            }
            $conn->close();
            exit;
        }
    } else {
        $result = $conn->query($sql);
        if ($result === false) {
            http_response_code(500);
            echo json_encode(['message' => 'Error en consulta: ' . $conn->error, 'sql_error' => $conn->error], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit;
        }
    }

    $tasks = [];
    $textKeys = ['title', 'subtitle', 'description', 'category', 'difficulty', 'currency', 'creator_username'];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            foreach ($textKeys as $k) {
                if (isset($row[$k]) && is_string($row[$k])) {
                    $row[$k] = fix_utf8_mojibake($row[$k]);
                }
            }
            $tasks[] = $row;
        }
    }

    // Si la consulta principal devolvió 0 filas, intentar consulta mínima (solo columnas esenciales)
    if (count($tasks) === 0 && empty($bindParams)) {
        $sqlMin = "SELECT t.id, t.title, t.description, t.price, t.category, t.difficulty, t.created_at, t.status,
            u.id AS creator_id, IFNULL(u.username, '') AS creator_username
            FROM tasks t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE (t.accepted_applicant_id IS NULL OR t.accepted_applicant_id = 0) AND t.status = 'open'
            ORDER BY t.created_at DESC";
        $resMin = @$conn->query($sqlMin);
        if ($resMin && $resMin->num_rows > 0) {
            while ($row = $resMin->fetch_assoc()) {
                $row['subtitle'] = isset($row['subtitle']) ? fix_utf8_mojibake($row['subtitle']) : '';
                $row['currency'] = isset($row['currency']) ? fix_utf8_mojibake($row['currency']) : 'USDC';
                $row['creator_rating'] = $row['creator_rating'] ?? null;
                $row['creator_total_ratings'] = $row['creator_total_ratings'] ?? null;
                $row['proposal_count'] = 0;
                foreach (['title', 'description', 'category', 'difficulty', 'creator_username'] as $k) {
                    if (isset($row[$k]) && is_string($row[$k])) $row[$k] = fix_utf8_mojibake($row[$k]);
                }
                $tasks[] = $row;
            }
        }
    }

    // Si sigue vacío y piden debug, incluir diagnóstico
    if (count($tasks) === 0 && isset($_GET['debug']) && $_GET['debug'] === '1') {
        $openCount = 0;
        $countResult = $conn->query("SELECT COUNT(*) AS c FROM tasks WHERE (accepted_applicant_id IS NULL OR accepted_applicant_id = 0) AND status = 'open'");
        if ($countResult && $row = $countResult->fetch_assoc()) {
            $openCount = (int) $row['c'];
        }
        $tasks = [
            'tasks' => [],
            'debug' => [
                'open_count' => $openCount,
                'db' => $conn->get_server_info(),
                'hint' => $openCount > 0 ? 'Hay tareas open pero la consulta devolvió 0.' : 'No hay tareas open en esta BD.',
            ],
        ];
    }

    // JSON con caracteres UTF-8 sin escapar (tildes y ñ correctos en el frontend)
    $json = json_encode($tasks, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        $json = '[]';
        if (function_exists('error_log')) {
            error_log('get_tasks.php json_encode error: ' . json_last_error_msg());
        }
    }
    header('Content-Length: ' . strlen($json));
    echo $json;
    while (ob_get_level()) {
        ob_end_flush();
    }
    flush();

    // Cerrar la conexión a la base de datos
    if (isset($stmt)) {
        $stmt->close();
    }
    $conn->close();

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
}
?>