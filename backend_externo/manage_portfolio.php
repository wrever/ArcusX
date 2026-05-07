<?php
/**
 * Endpoint para gestionar el portfolio de usuario
 * 
 * GET    /api/auth/manage_portfolio.php?user_id=123   → lista items
 * POST   /api/auth/manage_portfolio.php               → crear
 * PUT    /api/auth/manage_portfolio.php               → actualizar
 * DELETE /api/auth/manage_portfolio.php?id=1          → eliminar
 * 
 * Headers: Authorization: Bearer {JWT_TOKEN}
 */

ini_set('log_errors', 1);
$log_file = __DIR__ . '/error.log';
ini_set('error_log', $log_file);

function _manage_portfolio_log($msg) {
    global $log_file;
    $line = date('Y-m-d H:i:s') . ' [manage_portfolio] ' . $msg . "\n";
    error_log('[manage_portfolio] ' . $msg);
    @file_put_contents($log_file, $line, FILE_APPEND | LOCK_EX);
}

register_shutdown_function(function () use ($log_file) {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        $msg = 'FATAL: ' . $err['message'] . ' in ' . $err['file'] . ':' . $err['line'];
        error_log('[manage_portfolio] ' . $msg);
        @file_put_contents($log_file, date('Y-m-d H:i:s') . ' [manage_portfolio] ' . $msg . "\n", FILE_APPEND | LOCK_EX);
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error interno del servidor.'], JSON_UNESCAPED_UNICODE);
        }
    }
});

$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    require_once __DIR__ . '/config.php';
    if (!isset($conn) || !$conn) {
        throw new Exception('No database connection');
    }
} catch (Throwable $e) {
    _manage_portfolio_log('Error de configuración: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de configuración del servidor.'], JSON_UNESCAPED_UNICODE);
    exit();
}

function fix_utf8_mojibake($str) {
    if (!is_string($str) || $str === '') return $str;
    $bytes = @mb_convert_encoding($str, 'ISO-8859-1', 'UTF-8');
    if ($bytes === false) return $str;
    if (!mb_check_encoding($bytes, 'UTF-8')) return $str;
    return $bytes;
}

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (file_exists($autoload_path)) {
    require $autoload_path;
    use Firebase\JWT\JWT;
    use Firebase\JWT\Key;
}


function getLoggedInUserIdPortfolio($secret_key) {
    if (!class_exists('Firebase\\JWT\\JWT')) {
        return null;
    }
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
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
            error_log("JWT error en manage_portfolio.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET puede ser público si el perfil es público; el resto requiere dueño
if ($method === 'GET') {
    _manage_portfolio_log('GET inicio, user_id=' . (isset($_GET['user_id']) ? $_GET['user_id'] : 'no'));
    $targetUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    if ($targetUserId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id es requerido'], JSON_UNESCAPED_UNICODE);
        $conn->close();
        exit();
    }

    try {
        // Verificar que el usuario exista y si su perfil es público
        _manage_portfolio_log('GET consultando usuario id=' . $targetUserId);
        $stmtU = $conn->prepare("SELECT id, public_profile FROM users WHERE id = ?");
        if ($stmtU === false) {
            throw new Exception('Error al preparar consulta de usuario: ' . $conn->error);
        }
        $stmtU->bind_param("i", $targetUserId);
        $stmtU->execute();
        $resU = $stmtU->get_result();
        if ($resU->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
            $stmtU->close();
            $conn->close();
            exit();
        }
        $userRow = $resU->fetch_assoc();
        $stmtU->close();

        $publicProfile = isset($userRow['public_profile']) ? (int)$userRow['public_profile'] === 1 : true;

        // Si el perfil es privado, solo el dueño (con token) puede ver su portfolio
        if (!$publicProfile) {
            $currentUserId = getLoggedInUserIdPortfolio($jwt_secret);
            if (!$currentUserId || $currentUserId !== $targetUserId) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Este perfil es privado'], JSON_UNESCAPED_UNICODE);
                $conn->close();
                exit();
            }
        }

        // Verificar que tabla user_portfolio exista
        _manage_portfolio_log('GET verificando tabla user_portfolio');
        $check = $conn->query("SHOW TABLES LIKE 'user_portfolio'");
        if (!$check || $check->num_rows === 0) {
            http_response_code(200);
            echo json_encode(['success' => true, 'portfolio' => []], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }

        $stmt = $conn->prepare("
            SELECT id, title, description, image_url, project_url, category, created_at, updated_at
            FROM user_portfolio
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");
        if ($stmt === false) {
            throw new Exception('Error al preparar consulta de portfolio: ' . $conn->error);
        }
        $stmt->bind_param("i", $targetUserId);
        $stmt->execute();
        $res = $stmt->get_result();
        $portfolio = [];
        $textKeys = ['title', 'description', 'image_url', 'project_url', 'category'];
        while ($row = $res->fetch_assoc()) {
            foreach ($textKeys as $k) {
                if (isset($row[$k]) && is_string($row[$k])) {
                    $row[$k] = fix_utf8_mojibake($row[$k]);
                }
            }
            $portfolio[] = $row;
        }
        $stmt->close();

        http_response_code(200);
        echo json_encode(['success' => true, 'portfolio' => $portfolio], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        _manage_portfolio_log('GET error: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al obtener portfolio'], JSON_UNESCAPED_UNICODE);
    }

    if (isset($conn) && $conn) $conn->close();
    exit();
}

// Para POST/PUT/DELETE se requiere usuario autenticado
$userId = getLoggedInUserIdPortfolio($jwt_secret);
if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token requerido'], JSON_UNESCAPED_UNICODE);
    $conn->close();
    exit();
}

// Asegurar tabla user_portfolio
try {
    $check = $conn->query("SHOW TABLES LIKE 'user_portfolio'");
    if ($check && $check->num_rows === 0) {
        $createSql = "
            CREATE TABLE IF NOT EXISTS user_portfolio (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url VARCHAR(500),
                project_url VARCHAR(500),
                category VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $conn->query($createSql);
    }
} catch (Exception $e) {
    error_log("Error asegurando tabla user_portfolio: " . $e->getMessage());
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = [];
}

try {
    if ($method === 'POST') {
        // Crear nuevo item
        if (empty($data['title'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El título es requerido'], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }
        $title = trim($data['title']);
        $description = isset($data['description']) ? trim($data['description']) : null;
        $imageUrl = isset($data['image_url']) ? trim($data['image_url']) : null;
        $projectUrl = isset($data['project_url']) ? trim($data['project_url']) : null;
        $category = isset($data['category']) ? trim($data['category']) : 'Otros';

        if ($imageUrl !== null && $imageUrl !== '' && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'URL de imagen inválida'], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }
        if ($projectUrl !== null && $projectUrl !== '' && !filter_var($projectUrl, FILTER_VALIDATE_URL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'URL de proyecto inválida'], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }

        $stmt = $conn->prepare("
            INSERT INTO user_portfolio (user_id, title, description, image_url, project_url, category)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        if ($stmt === false) {
            throw new Exception('Error al preparar inserción de portfolio: ' . $conn->error);
        }
        $stmt->bind_param("isssss", $userId, $title, $description, $imageUrl, $projectUrl, $category);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();

        http_response_code(201);
        echo json_encode(['success' => true, 'id' => $newId], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'PUT') {
        // Actualizar item existente
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id es requerido'], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }
        $itemId = (int)$data['id'];

        // Verificar que pertenece al usuario
        $stmtC = $conn->prepare("SELECT user_id FROM user_portfolio WHERE id = ?");
        if ($stmtC === false) {
            throw new Exception('Error al preparar verificación de item: ' . $conn->error);
        }
        $stmtC->bind_param("i", $itemId);
        $stmtC->execute();
        $resC = $stmtC->get_result();
        if ($resC->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Item de portfolio no encontrado'], JSON_UNESCAPED_UNICODE);
            $stmtC->close();
            $conn->close();
            exit();
        }
        $rowC = $resC->fetch_assoc();
        $stmtC->close();
        if ((int)$rowC['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'No tienes permiso para modificar este item'], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }

        $fields = [];
        $types = '';
        $params = [];

        if (isset($data['title'])) {
            $fields[] = "title = ?";
            $params[] = trim($data['title']);
            $types .= 's';
        }
        if (isset($data['description'])) {
            $fields[] = "description = ?";
            $params[] = trim($data['description']);
            $types .= 's';
        }
        if (isset($data['image_url'])) {
            $imageUrl = trim($data['image_url']);
            if ($imageUrl !== '' && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'URL de imagen inválida'], JSON_UNESCAPED_UNICODE);
                $conn->close();
                exit();
            }
            $fields[] = "image_url = ?";
            $params[] = $imageUrl !== '' ? $imageUrl : null;
            $types .= 's';
        }
        if (isset($data['project_url'])) {
            $projectUrl = trim($data['project_url']);
            if ($projectUrl !== '' && !filter_var($projectUrl, FILTER_VALIDATE_URL)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'URL de proyecto inválida'], JSON_UNESCAPED_UNICODE);
                $conn->close();
                exit();
            }
            $fields[] = "project_url = ?";
            $params[] = $projectUrl !== '' ? $projectUrl : null;
            $types .= 's';
        }
        if (isset($data['category'])) {
            $fields[] = "category = ?";
            $params[] = trim($data['category']);
            $types .= 's';
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No hay campos para actualizar'], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }

        $params[] = $itemId;
        $types .= 'i';

        $sql = "UPDATE user_portfolio SET " . implode(',', $fields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        if ($stmt === false) {
            throw new Exception('Error al preparar actualización de portfolio: ' . $conn->error);
        }
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();

        http_response_code(200);
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        // Eliminar item
        $itemId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($itemId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id es requerido'], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }

        // Verificar que pertenece al usuario
        $stmtC = $conn->prepare("SELECT user_id FROM user_portfolio WHERE id = ?");
        if ($stmtC === false) {
            throw new Exception('Error al preparar verificación de item: ' . $conn->error);
        }
        $stmtC->bind_param("i", $itemId);
        $stmtC->execute();
        $resC = $stmtC->get_result();
        if ($resC->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Item de portfolio no encontrado'], JSON_UNESCAPED_UNICODE);
            $stmtC->close();
            $conn->close();
            exit();
        }
        $rowC = $resC->fetch_assoc();
        $stmtC->close();
        if ((int)$rowC['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'No tienes permiso para eliminar este item'], JSON_UNESCAPED_UNICODE);
            $conn->close();
            exit();
        }

        $stmt = $conn->prepare("DELETE FROM user_portfolio WHERE id = ?");
        if ($stmt === false) {
            throw new Exception('Error al preparar eliminación de portfolio: ' . $conn->error);
        }
        $stmt->bind_param("i", $itemId);
        $stmt->execute();
        $stmt->close();

        http_response_code(200);
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    error_log("Error en manage_portfolio.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno en portfolio'], JSON_UNESCAPED_UNICODE);
}

$conn->close();


