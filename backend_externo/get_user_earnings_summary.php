<?php
/**
 * get_user_earnings_summary.php
 * Obtiene un resumen de ganancias del usuario
 * GET /api/auth/get_user_earnings_summary.php?user_id=123
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
        
        // Solo permitir que un usuario vea sus propios datos (a menos que sea admin)
        $userIsAdmin = isAdmin($conn, $loggedInUserId);
        if ($userId !== $loggedInUserId && !$userIsAdmin) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'No tienes permiso para ver estos datos'
            ]);
            $conn->close();
            exit;
        }
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
        // Incluir tareas con status='completed' que tengan escrow_id (indica que hubo escrow)
        $platformFeeEscaped = (float)$platformFee;
        $userIdEscaped = (int)$userId;
        
        $earnedSql = "
            SELECT COALESCE(SUM(t.price), 0) as total_earned
            FROM tasks t
            WHERE t.accepted_applicant_id = " . $userIdEscaped . "
              AND t.status = 'completed'
              AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
        ";
        
        $earnedResult = $conn->query($earnedSql);
        if ($earnedResult === false) {
            throw new Exception('Error al ejecutar consulta de ganancias: ' . $conn->error);
        }
        
        $earnedRow = $earnedResult->fetch_assoc();
        $totalEarned = (float)$earnedRow['total_earned'];
        
        // Calcular total pagado (como cliente)
        // Usar escrow_amount si existe, sino calcular con fórmula: escrowAmount = workerAmount / (1 - platformFee)
        $checkEscrowAmount = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_amount'");
        $hasEscrowAmount = $checkEscrowAmount && $checkEscrowAmount->num_rows > 0;
        
        // Incluir tareas con status='completed' que tengan escrow_id (indica que hubo escrow)
        if ($hasEscrowAmount) {
            $paidSql = "
                SELECT COALESCE(SUM(COALESCE(t.escrow_amount, t.price / (1 - " . $platformFeeEscaped . "))), 0) as total_paid
                FROM tasks t
                WHERE t.user_id = " . $userIdEscaped . "
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
            ";
        } else {
            $paidSql = "
                SELECT COALESCE(SUM(t.price / (1 - " . $platformFeeEscaped . ")), 0) as total_paid
                FROM tasks t
                WHERE t.user_id = " . $userIdEscaped . "
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
            ";
        }
        
        $paidResult = $conn->query($paidSql);
        if ($paidResult === false) {
            throw new Exception('Error al ejecutar consulta de pagos: ' . $conn->error);
        }
        
        $paidRow = $paidResult->fetch_assoc();
        $totalPaid = (float)$paidRow['total_paid'];
        
        // Contar total de transacciones
        // Incluir tareas con status='completed' que tengan escrow_id (indica que hubo escrow)
        $countSql = "
            SELECT COUNT(*) as total
            FROM (
                SELECT t.id
                FROM tasks t
                WHERE t.user_id = " . $userIdEscaped . " 
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
                UNION ALL
                SELECT t.id
                FROM tasks t
                WHERE t.accepted_applicant_id = " . $userIdEscaped . " 
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
            ) as combined
        ";
        
        $countResult = $conn->query($countSql);
        if ($countResult === false) {
            throw new Exception('Error al ejecutar consulta de conteo: ' . $conn->error);
        }
        
        $countRow = $countResult->fetch_assoc();
        $totalTransactions = (int)$countRow['total'];
        
        // Obtener última transacción
        // Incluir escrow_amount directamente en el SELECT para evitar consultas adicionales
        // Incluir tareas con status='completed' que tengan escrow_id (indica que hubo escrow)
        if ($hasEscrowAmount) {
            $lastTransactionSql = "
                SELECT 
                    t.id as task_id,
                    t.title as task_title,
                    t.price,
                    t.escrow_amount,
                    COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                    CASE 
                        WHEN t.user_id = " . $userIdEscaped . " THEN 'paid'
                        ELSE 'received'
                    END as transaction_type,
                    t.escrow_id
                FROM tasks t
                WHERE (t.user_id = " . $userIdEscaped . " OR t.accepted_applicant_id = " . $userIdEscaped . ")
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
                ORDER BY completed_date DESC
                LIMIT 1
            ";
        } else {
            $lastTransactionSql = "
                SELECT 
                    t.id as task_id,
                    t.title as task_title,
                    t.price,
                    NULL as escrow_amount,
                    COALESCE(t.escrow_completed_at, t.completed_at, t.created_at) as completed_date,
                    CASE 
                        WHEN t.user_id = " . $userIdEscaped . " THEN 'paid'
                        ELSE 'received'
                    END as transaction_type,
                    t.escrow_id
                FROM tasks t
                WHERE (t.user_id = " . $userIdEscaped . " OR t.accepted_applicant_id = " . $userIdEscaped . ")
                  AND t.status = 'completed'
                  AND (t.escrow_status = 'completed' OR (t.escrow_id IS NOT NULL AND (t.escrow_status IS NULL OR t.escrow_status != 'refunded')))
                ORDER BY completed_date DESC
                LIMIT 1
            ";
        }
        
        $lastResult = $conn->query($lastTransactionSql);
        if ($lastResult === false) {
            throw new Exception('Error al ejecutar consulta de última transacción: ' . $conn->error);
        }
        
        $lastTransaction = null;
        
        if ($lastRow = $lastResult->fetch_assoc()) {
            $price = (float)$lastRow['price']; // price ahora es workerAmount
            // En el nuevo modelo:
            // - received: trabajador recibe price (ya es el monto exacto)
            // - paid: cliente pagó escrow_amount o calcular con fórmula
            if ($lastRow['transaction_type'] === 'received') {
                $netAmount = $price; // Trabajador recibe el monto exacto
            } else {
                // Cliente pagó: usar escrow_amount si existe, sino calcular con fórmula
                $escrowAmount = isset($lastRow['escrow_amount']) ? $lastRow['escrow_amount'] : null;
                
                if ($escrowAmount !== null && $escrowAmount > 0) {
                    $netAmount = (float)$escrowAmount;
                } else {
                    // Fallback: calcular con fórmula escrowAmount = workerAmount / (1 - platformFee)
                    $netAmount = $price / (1 - $platformFee);
                }
            }
            
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
