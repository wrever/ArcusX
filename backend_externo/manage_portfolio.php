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

require_once 'config.php';

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (file_exists($autoload_path)) {
    require $autoload_path;
    use Firebase\JWT\JWT;
    use Firebase\JWT\Key;
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

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
    $targetUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    if ($targetUserId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id es requerido']);
        $conn->close();
        exit();
    }

    try {
        // Verificar que el usuario exista y si su perfil es público
        $stmtU = $conn->prepare("SELECT id, public_profile FROM users WHERE id = ?");
        if ($stmtU === false) {
            throw new Exception('Error al preparar consulta de usuario: ' . $conn->error);
        }
        $stmtU->bind_param("i", $targetUserId);
        $stmtU->execute();
        $resU = $stmtU->get_result();
        if ($resU->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
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
                echo json_encode(['success' => false, 'message' => 'Este perfil es privado']);
                $conn->close();
                exit();
            }
        }

        // Verificar que tabla user_portfolio exista
        $check = $conn->query("SHOW TABLES LIKE 'user_portfolio'");
        if (!$check || $check->num_rows === 0) {
            http_response_code(200);
            echo json_encode(['success' => true, 'portfolio' => []]);
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
        while ($row = $res->fetch_assoc()) {
            $portfolio[] = $row;
        }
        $stmt->close();

        http_response_code(200);
        echo json_encode(['success' => true, 'portfolio' => $portfolio]);
    } catch (Exception $e) {
        error_log("Error en manage_portfolio.php (GET): " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al obtener portfolio']);
    }

    $conn->close();
    exit();
}

// Para POST/PUT/DELETE se requiere usuario autenticado
$userId = getLoggedInUserIdPortfolio($jwt_secret);
if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token requerido']);
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
            echo json_encode(['success' => false, 'message' => 'El título es requerido']);
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
            echo json_encode(['success' => false, 'message' => 'URL de imagen inválida']);
            $conn->close();
            exit();
        }
        if ($projectUrl !== null && $projectUrl !== '' && !filter_var($projectUrl, FILTER_VALIDATE_URL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'URL de proyecto inválida']);
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
        echo json_encode(['success' => true, 'id' => $newId]);
    } elseif ($method === 'PUT') {
        // Actualizar item existente
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id es requerido']);
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
            echo json_encode(['success' => false, 'message' => 'Item de portfolio no encontrado']);
            $stmtC->close();
            $conn->close();
            exit();
        }
        $rowC = $resC->fetch_assoc();
        $stmtC->close();
        if ((int)$rowC['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'No tienes permiso para modificar este item']);
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
                echo json_encode(['success' => false, 'message' => 'URL de imagen inválida']);
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
                echo json_encode(['success' => false, 'message' => 'URL de proyecto inválida']);
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
            echo json_encode(['success' => false, 'message' => 'No hay campos para actualizar']);
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
        echo json_encode(['success' => true]);
    } elseif ($method === 'DELETE') {
        // Eliminar item
        $itemId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($itemId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id es requerido']);
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
            echo json_encode(['success' => false, 'message' => 'Item de portfolio no encontrado']);
            $stmtC->close();
            $conn->close();
            exit();
        }
        $rowC = $resC->fetch_assoc();
        $stmtC->close();
        if ((int)$rowC['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'No tienes permiso para eliminar este item']);
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
        echo json_encode(['success' => true]);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    }
} catch (Exception $e) {
    error_log("Error en manage_portfolio.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno en portfolio']);
}

$conn->close();


