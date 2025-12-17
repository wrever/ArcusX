<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
/**
 * get_user_profile.php
 * Endpoint para obtener perfil público de usuario
 * GET /api/auth/get_user_profile.php?user_id=123
 * Headers: Authorization: Bearer {JWT_TOKEN} (opcional, para saber si es el dueño)
 */

require_once 'config.php';

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
function getLoggedInUserIdProfile($secret_key) {
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
            error_log("JWT error en get_user_profile.php: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $profileUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        if ($profileUserId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'user_id es requerido y debe ser válido']);
            $conn->close();
            exit();
        }

        $currentUserId = getLoggedInUserIdProfile($jwt_secret);

        // Asegurar columnas mínimas de perfil
        try {
            $cols = [
                'avatar_url' => "VARCHAR(500) NULL",
                'bio' => "TEXT NULL",
                'portfolio_url' => "VARCHAR(500) NULL",
                'public_profile' => "TINYINT(1) DEFAULT 1"
            ];
            foreach ($cols as $name => $def) {
                $check = $conn->query("SHOW COLUMNS FROM users LIKE '" . $name . "'");
                if ($check && $check->num_rows === 0) {
                    $conn->query("ALTER TABLE users ADD COLUMN " . $name . " " . $def);
                }
            }
        } catch (Exception $e) {
            error_log("Error asegurando columnas de perfil: " . $e->getMessage());
        }

        // Obtener datos básicos del usuario
        $stmt = $conn->prepare("
            SELECT 
                id,
                username,
                email,
                avatar_url,
                bio,
                portfolio_url,
                public_profile,
                created_at,
                average_rating,
                total_ratings
            FROM users
            WHERE id = ?
            LIMIT 1
        ");
        if (!$stmt) {
            throw new Exception('Error al preparar consulta de usuario: ' . $conn->error);
        }
        $stmt->bind_param("i", $profileUserId);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
            $stmt->close();
            $conn->close();
            exit();
        }
        $user = $res->fetch_assoc();
        $stmt->close();

        $isOwner = $currentUserId && $currentUserId === (int)$user['id'];
        $isPublic = isset($user['public_profile']) ? (int)$user['public_profile'] === 1 : true;

        if (!$isPublic && !$isOwner) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Este perfil es privado']);
            $conn->close();
            exit();
        }

        // Portfolio (si existe la tabla)
        $portfolio = [];
        $checkPortfolio = $conn->query("SHOW TABLES LIKE 'user_portfolio'");
        if ($checkPortfolio && $checkPortfolio->num_rows > 0) {
            $stmtP = $conn->prepare("
                SELECT id, title, description, image_url, project_url, category, created_at, updated_at
                FROM user_portfolio
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            ");
            if ($stmtP) {
                $stmtP->bind_param("i", $profileUserId);
                $stmtP->execute();
                $resP = $stmtP->get_result();
                while ($row = $resP->fetch_assoc()) {
                    $portfolio[] = $row;
                }
                $stmtP->close();
            }
        }

        // Construir respuesta
        $profile = [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'avatar_url' => $user['avatar_url'],
            'bio' => $user['bio'],
            'portfolio_url' => $user['portfolio_url'],
            'public_profile' => $isPublic,
            'member_since' => $user['created_at'],
            'average_rating' => $user['average_rating'] !== null ? (float)$user['average_rating'] : 0.0,
            'total_ratings' => $user['total_ratings'] !== null ? (int)$user['total_ratings'] : 0,
            'portfolio' => $portfolio
        ];

        // Solo el dueño ve su email
        if ($isOwner) {
            $profile['email'] = $user['email'];
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'profile' => $profile
        ]);

    } catch (Exception $e) {
        error_log("Error en get_user_profile.php: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener perfil de usuario: ' . $e->getMessage()
        ]);
    } finally {
        if (isset($conn) && $conn instanceof mysqli) {
            $conn->close();
        }
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit();
}
?>
