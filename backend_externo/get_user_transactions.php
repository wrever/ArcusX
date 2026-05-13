<?php
/**
 * get_user_transactions.php
 * Obtiene el historial de transacciones del usuario
 * GET /api/auth/get_user_transactions.php?user_id=123&page=1&limit=20
 * Headers: Authorization: Bearer {JWT_TOKEN}
 */

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('GET, OPTIONS');
require_once 'config.php';

$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).'
    ]);
    exit();
}
require $autoload_path;
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');


/**
 * Verificar si el usuario es administrador
 */
function isAdmin($conn, $userId) {
    if (!$userId) {
        return false;
    }
    
    $stmt = $conn->prepare("SELECT is_admin FROM users WHERE id = ?");
    if (!$stmt) {
        error_log("Error preparando consulta isAdmin: " . $conn->error);
        return false;
    }
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        return false;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    return isset($user['is_admin']) && $user['is_admin'] == 1;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $loggedInUserId = arcusx_jwt_user_id();

        if ($loggedInUserId === null) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'
            ]);
            $conn->close();
            exit;
        }
        
        // Obtener user_id (del token o parámetro)
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : $loggedInUserId;
        
        // Solo permitir que un usuario vea sus propias transacciones (a menos que sea admin)
        $userIsAdmin = isAdmin($conn, $loggedInUserId);
        if ($userId !== $loggedInUserId && !$userIsAdmin) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'No tienes permiso para ver estas transacciones'
            ]);
            $conn->close();
            exit;
        }
        // Parámetros de paginación
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;
        
        // Obtener platform fee
        $platformFee = 0.03; // Valor por defecto (3%)
        try {
            $checkTable = $conn->query("SHOW TABLES LIKE 'system_config'");
            if ($checkTable !== false && $checkTable->num_rows > 0) {
                $feeResult = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'platform_fee'");
                if ($feeResult !== false && $feeResult->num_rows > 0) {
                    $feeRow = $feeResult->fetch_assoc();
                    $feeValue = $feeRow['config_value'];
                    $platformFee = is_numeric($feeValue) ? (float)$feeValue : 0.03;
                }
            }
        } catch (Exception $e) {
            error_log('Error al obtener platform_fee: ' . $e->getMessage());
        }
        
        // Verificar si la columna escrow_amount existe
        $checkEscrowAmount = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_amount'");
        $hasEscrowAmount = $checkEscrowAmount && $checkEscrowAmount->num_rows > 0;
        
        // Consultar tareas completadas donde el usuario es cliente o trabajador
        // Incluir escrow_amount directamente en el SELECT para evitar consultas adicionales
        // IMPORTANTE: Incluir tareas con status='completed' que tengan escrow_id (indica que hubo escrow)
        // incluso si escrow_status no es 'completed' (para tareas antiguas)
        if ($hasEscrowAmount) {
            $sql = "
                SELECT 
                    t.id as task_id,
                    t.title as task_title,
                    t.price,
                    t.escrow_amount,
                    COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                    'paid' as transaction_type,
                    t.escrow_id,
                    t.escrow_status
                FROM tasks t
                WHERE t.user_id = " . (int)$userId . "
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
                
                UNION ALL
                
                SELECT 
                    t.id as task_id,
                    t.title as task_title,
                    t.price,
                    t.escrow_amount,
                    COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                    'received' as transaction_type,
                    t.escrow_id,
                    t.escrow_status
                FROM tasks t
                WHERE t.accepted_applicant_id = " . (int)$userId . "
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
                
                ORDER BY completed_date DESC
                LIMIT " . (int)$limit . " OFFSET " . (int)$offset . "
            ";
        } else {
            $sql = "
                SELECT 
                    t.id as task_id,
                    t.title as task_title,
                    t.price,
                    NULL as escrow_amount,
                    COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                    'paid' as transaction_type,
                    t.escrow_id,
                    t.escrow_status
                FROM tasks t
                WHERE t.user_id = " . (int)$userId . "
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
                
                UNION ALL
                
                SELECT 
                    t.id as task_id,
                    t.title as task_title,
                    t.price,
                    NULL as escrow_amount,
                    COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                    'received' as transaction_type,
                    t.escrow_id,
                    t.escrow_status
                FROM tasks t
                WHERE t.accepted_applicant_id = " . (int)$userId . "
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
                
                ORDER BY completed_date DESC
                LIMIT " . (int)$limit . " OFFSET " . (int)$offset . "
            ";
        }
        
        $result = $conn->query($sql);
        if ($result === false) {
            throw new Exception('Error al ejecutar consulta: ' . $conn->error);
        }
        
        $transactions = [];
        while ($row = $result->fetch_assoc()) {
            $price = (float)$row['price']; // price es workerAmount
            
            // Calcular monto según el tipo de transacción (nuevo modelo)
            if ($row['transaction_type'] === 'received') {
                // Trabajador recibe: price (ya es el monto exacto que recibirá)
                $netAmount = $price;
            } else {
                // Cliente paga: usar escrow_amount si existe, sino calcular con fórmula
                // Fórmula: escrowAmount = workerAmount / (1 - platformFee)
                $escrowAmount = isset($row['escrow_amount']) ? $row['escrow_amount'] : null;
                
                if ($escrowAmount !== null && $escrowAmount > 0) {
                    $netAmount = (float)$escrowAmount;
                } else {
                    // Fallback: calcular con fórmula escrowAmount = workerAmount / (1 - platformFee)
                    $netAmount = $price / (1 - $platformFee);
                }
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
        // Incluir tareas con status='completed' que tengan escrow_id (indica que hubo escrow)
        $countSql = "
            SELECT COUNT(*) as total
            FROM (
                SELECT t.id
                FROM tasks t
                WHERE t.user_id = " . (int)$userId . " 
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
                UNION ALL
                SELECT t.id
                FROM tasks t
                WHERE t.accepted_applicant_id = " . (int)$userId . " 
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
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
        $conn->close();
        exit;
    }
    
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    $conn->close();
    exit;
}
?>
