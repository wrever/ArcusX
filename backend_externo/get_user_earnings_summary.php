<?php
// get_user_earnings_summary.php
// Obtiene un resumen de ganancias del usuario

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
    
    // Solo permitir que un usuario vea sus propios datos (a menos que sea admin)
    $userIsAdmin = isAdmin($conn, $loggedInUserId);
    if ($userId !== $loggedInUserId && !$userIsAdmin) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No tienes permiso para ver estos datos']);
        $conn->close();
        exit;
    }
    
    try {
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
        
        // Calcular total ganado (como trabajador)
        // En el nuevo modelo: price ya es el monto que recibió el trabajador
        $platformFeeEscaped = (float)$platformFee;
        $userIdEscaped = (int)$userId;
        
        $earnedSql = "
            SELECT COALESCE(SUM(t.price), 0) as total_earned
            FROM tasks t
            WHERE t.accepted_applicant_id = " . $userIdEscaped . "
              AND t.status = 'completed'
              AND t.escrow_status = 'completed'
        ";
        
        $earnedResult = $conn->query($earnedSql);
        if ($earnedResult === false) {
            throw new Exception('Error al ejecutar consulta de ganancias: ' . $conn->error);
        }
        
        $earnedRow = $earnedResult->fetch_assoc();
        $totalEarned = (float)$earnedRow['total_earned'];
        
        // Calcular total pagado (como cliente)
        // En el nuevo modelo: el cliente paga price + commission
        $paidSql = "
            SELECT COALESCE(SUM(t.price * (1 + " . $platformFeeEscaped . ")), 0) as total_paid
            FROM tasks t
            WHERE t.user_id = " . $userIdEscaped . "
              AND t.status = 'completed'
              AND t.escrow_status = 'completed'
        ";
        
        $paidResult = $conn->query($paidSql);
        if ($paidResult === false) {
            throw new Exception('Error al ejecutar consulta de pagos: ' . $conn->error);
        }
        
        $paidRow = $paidResult->fetch_assoc();
        $totalPaid = (float)$paidRow['total_paid'];
        
        // Contar total de transacciones
        $countSql = "
            SELECT COUNT(*) as total
            FROM (
                SELECT t.id
                FROM tasks t
                WHERE t.user_id = " . $userIdEscaped . " AND t.status = 'completed' AND t.escrow_status = 'completed'
                UNION ALL
                SELECT t.id
                FROM tasks t
                WHERE t.accepted_applicant_id = " . $userIdEscaped . " AND t.status = 'completed' AND t.escrow_status = 'completed'
            ) as combined
        ";
        
        $countResult = $conn->query($countSql);
        if ($countResult === false) {
            throw new Exception('Error al ejecutar consulta de conteo: ' . $conn->error);
        }
        
        $countRow = $countResult->fetch_assoc();
        $totalTransactions = (int)$countRow['total'];
        
        // Obtener última transacción
        $lastTransactionSql = "
            SELECT 
                t.id as task_id,
                t.title as task_title,
                t.price,
                COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                CASE 
                    WHEN t.user_id = " . $userIdEscaped . " THEN 'paid'
                    ELSE 'received'
                END as transaction_type,
                t.escrow_id
            FROM tasks t
            WHERE (t.user_id = " . $userIdEscaped . " OR t.accepted_applicant_id = " . $userIdEscaped . ")
              AND t.status = 'completed'
              AND t.escrow_status = 'completed'
            ORDER BY completed_date DESC
            LIMIT 1
        ";
        
        $lastResult = $conn->query($lastTransactionSql);
        if ($lastResult === false) {
            throw new Exception('Error al ejecutar consulta de última transacción: ' . $conn->error);
        }
        
        $lastTransaction = null;
        
        if ($lastRow = $lastResult->fetch_assoc()) {
            $price = (float)$lastRow['price']; // price ahora es workerAmount
            // En el nuevo modelo:
            // - received: trabajador recibe price (ya es el monto exacto)
            // - paid: cliente pagó price + commission
            $netAmount = $lastRow['transaction_type'] === 'received' 
                ? $price  // Trabajador recibe el monto exacto
                : $price * (1 + $platformFee); // Cliente pagó price + commission
            
            $lastTransaction = [
                'id' => $lastRow['task_id'],
                'task_id' => $lastRow['task_id'],
                'type' => $lastRow['transaction_type'],
                'amount' => number_format($netAmount, 7, '.', ''),
                'currency' => 'USDC',
                'task_title' => $lastRow['task_title'],
                'date' => $lastRow['completed_date'],
                'status' => 'completed',
                'escrow_id' => $lastRow['escrow_id']
            ];
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'total_earned' => number_format($totalEarned, 7, '.', ''),
            'total_paid' => number_format($totalPaid, 7, '.', ''),
            'total_transactions' => $totalTransactions,
            'last_transaction' => $lastTransaction
        ]);
        
    } catch (Exception $e) {
        error_log('Error en get_user_earnings_summary.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener resumen de ganancias: ' . $e->getMessage()
        ]);
    }
    
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>
