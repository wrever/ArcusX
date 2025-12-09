<?php
// get_user_transactions.php
// Obtiene el historial de transacciones del usuario

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

$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

// Función para obtener el ID del usuario logueado desde el token JWT
function getLoggedInUserId($conn, $secret_key) {
    // Método 1: $_SERVER['HTTP_AUTHORIZATION'] (configurado por .htaccess)
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = trim($_SERVER['HTTP_AUTHORIZATION']);
    } 
    // Método 2: getallheaders() (fallback)
    else if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if ($headers && isset($headers['Authorization'])) {
            $authHeader = trim($headers['Authorization']);
        }
    }

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
        if (!$jwt) return null;
        try {
            $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
            return $decoded->data->id;
        } catch (Exception $e) {
            error_log("JWT Error: " . $e->getMessage());
            return null;
        }
    }
    return null;
}

// Función para verificar si es admin
function isAdmin($conn, $userId) {
    $stmt = $conn->prepare("SELECT is_admin, role FROM users WHERE id = ?");
    if (!$stmt) return false;
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        return false;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    return ($user['is_admin'] == 1 || $user['role'] === 'admin');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);
    
    if (!$loggedInUserId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.']);
        $conn->close();
        exit;
    }
    
    // Obtener user_id (del token o parámetro)
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : $loggedInUserId;
    
    // Solo permitir que un usuario vea sus propias transacciones (a menos que sea admin)
    $userIsAdmin = isAdmin($conn, $loggedInUserId);
    if ($userId !== $loggedInUserId && !$userIsAdmin) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No tienes permiso para ver estas transacciones']);
        $conn->close();
        exit;
    }
    
    try {
        // Parámetros de paginación
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;
        
        // Obtener platform fee
        $platformFee = 0.003; // Valor por defecto
        try {
            $checkTable = $conn->query("SHOW TABLES LIKE 'system_config'");
            if ($checkTable !== false && $checkTable->num_rows > 0) {
                $feeResult = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'platform_fee'");
                if ($feeResult !== false && $feeResult->num_rows > 0) {
                    $feeRow = $feeResult->fetch_assoc();
                    $feeValue = $feeRow['config_value'];
                    $platformFee = is_numeric($feeValue) ? (float)$feeValue : 0.003;
                }
            }
        } catch (Exception $e) {
            error_log('Error al obtener platform_fee: ' . $e->getMessage());
        }
        
        // Consultar tareas completadas donde el usuario es cliente o trabajador
        // Usar consulta directa con parámetros escapados para evitar problemas con UNION ALL
        $sql = "
            SELECT 
                t.id as task_id,
                t.title as task_title,
                t.price,
                COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                'paid' as transaction_type,
                t.escrow_id,
                t.escrow_status
            FROM tasks t
            WHERE t.user_id = " . (int)$userId . "
              AND t.status = 'completed'
              AND t.escrow_status = 'completed'
            
            UNION ALL
            
            SELECT 
                t.id as task_id,
                t.title as task_title,
                t.price,
                COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                'received' as transaction_type,
                t.escrow_id,
                t.escrow_status
            FROM tasks t
            WHERE t.accepted_applicant_id = " . (int)$userId . "
              AND t.status = 'completed'
              AND t.escrow_status = 'completed'
            
            ORDER BY completed_date DESC
            LIMIT " . (int)$limit . " OFFSET " . (int)$offset . "
        ";
        
        $result = $conn->query($sql);
        if ($result === false) {
            throw new Exception('Error al ejecutar consulta: ' . $conn->error);
        }
        
        $transactions = [];
        while ($row = $result->fetch_assoc()) {
            $price = (float)$row['price'];
            
            // Calcular monto neto según el tipo de transacción
            if ($row['transaction_type'] === 'received') {
                // Trabajador recibe: precio - comisión
                $netAmount = $price * (1 - $platformFee);
            } else {
                // Cliente paga: precio completo
                $netAmount = $price;
            }
            
            $transactions[] = [
                'id' => $row['task_id'],
                'task_id' => $row['task_id'],
                'type' => $row['transaction_type'],
                'amount' => number_format($netAmount, 7, '.', ''),
                'currency' => 'USDC',
                'task_title' => $row['task_title'],
                'date' => $row['completed_date'],
                'status' => 'completed',
                'escrow_id' => $row['escrow_id']
            ];
        }
        
        // Contar total de transacciones (sin paginación)
        $countSql = "
            SELECT COUNT(*) as total
            FROM (
                SELECT t.id
                FROM tasks t
                WHERE t.user_id = " . (int)$userId . " AND t.status = 'completed' AND t.escrow_status = 'completed'
                UNION ALL
                SELECT t.id
                FROM tasks t
                WHERE t.accepted_applicant_id = " . (int)$userId . " AND t.status = 'completed' AND t.escrow_status = 'completed'
            ) as combined
        ";
        
        $countResult = $conn->query($countSql);
        if ($countResult === false) {
            throw new Exception('Error al ejecutar consulta de conteo: ' . $conn->error);
        }
        
        $totalRow = $countResult->fetch_assoc();
        $total = (int)$totalRow['total'];
        $totalPages = ceil($total / $limit);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'transactions' => $transactions,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => $totalPages
            ]
        ]);
        
    } catch (Exception $e) {
        error_log('Error en get_user_transactions.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener transacciones: ' . $e->getMessage()
        ]);
    }
    
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>
