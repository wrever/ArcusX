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
    require_once 'config.php'; // Incluye la configuración de la base de datos
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Error de conexión a la base de datos']);
    exit;
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

    // Condiciones base
    $where[] = "t.accepted_applicant_id IS NULL";
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
            // Ordenar por número de propuestas (más populares primero)
            $orderBy = "(SELECT COUNT(*) FROM applications a WHERE a.task_id = t.id) DESC, t.created_at DESC";
            break;
    }

    // Preparar la consulta SQL
    // Usar IFNULL para manejar columnas que pueden no existir
    $sql = "SELECT
            t.id,
            t.title,
            t.subtitle,
            t.description,
            t.price,
            t.currency,
            t.difficulty,
            t.category,
            u.username AS creator_username,
            u.id AS creator_id,
            IFNULL(u.average_rating, NULL) AS creator_rating,
            IFNULL(u.total_ratings, NULL) AS creator_total_ratings,
            t.created_at,
            t.status,
            (SELECT COUNT(*) FROM applications a WHERE a.task_id = t.id) AS proposal_count
        FROM
            tasks t
        JOIN
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
            $result = $stmt->get_result();
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'Error al preparar consulta: ' . $conn->error, 'sql_error' => $conn->error]);
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
            echo json_encode(['message' => 'Error en consulta: ' . $conn->error, 'sql_error' => $conn->error]);
            $conn->close();
            exit;
        }
    }

    $tasks = [];
    if ($result->num_rows > 0) {
        // Recorrer los resultados y almacenar los resultados en un array
        while($row = $result->fetch_assoc()) {
            $tasks[] = $row;
        }
    }

    // Devolver las tareas en formato JSON
    echo json_encode($tasks);

    // Cerrar la conexión a la base de datos
    if (isset($stmt)) {
        $stmt->close();
    }
    $conn->close();

} else {
    // Si la solicitud no es GET, devolver método no permitido
    http_response_code(405); // Method Not Allowed
    echo json_encode(['message' => 'Método no permitido']);
}
?>