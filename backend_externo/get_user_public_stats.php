<?php
/**
 * get_user_public_stats.php
 * Endpoint para obtener estadísticas públicas de un usuario
 * GET /api/auth/get_user_public_stats.php?user_id=123
 * Headers: Authorization: Bearer {JWT_TOKEN} (opcional)
 */

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

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Headers CORS
$_cors_origin = (function(){ $o=$_SERVER["HTTP_ORIGIN"]??""; return in_array($o,["http://localhost:5173","http://localhost:5174","https://arcusx.pro","http://arcusx.pro"],true)?$o:"https://arcusx.pro"; })(); header("Access-Control-Allow-Origin: ".$_cors_origin);
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'user_id es requerido y debe ser válido']);
            $conn->close();
            exit();
        }

        // Verificar que el usuario exista
        $check = $conn->prepare("SELECT id FROM users WHERE id = ?");
        if ($check === false) {
            throw new Exception('Error al preparar verificación de usuario: ' . $conn->error);
        }
        $check->bind_param("i", $userId);
        $check->execute();
        $resCheck = $check->get_result();
        if ($resCheck->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
            $check->close();
            $conn->close();
            exit();
        }
        $check->close();

        // Obtener platform fee para cálculos retroactivos si no hay escrow_amount
        $platformFee = 0.003; // default 0.3%
        try {
            $feeRes = $conn->query("SHOW TABLES LIKE 'system_config'");
            if ($feeRes && $feeRes->num_rows > 0) {
                $cfg = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'platform_fee'");
                if ($cfg && $cfg->num_rows > 0) {
                    $rowCfg = $cfg->fetch_assoc();
                    if (is_numeric($rowCfg['config_value'])) {
                        $platformFee = (float)$rowCfg['config_value'];
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Error obteniendo platform_fee en get_user_public_stats.php: " . $e->getMessage());
        }
        $platformFeeEscaped = (float)$platformFee;

        // Tareas completadas como trabajador
        // IMPORTANTE: Solo contar tareas donde el usuario fue aceptado como trabajador
        // y la tarea está completada (status = 'completed' y escrow_status = 'completed')
        $sqlCompleted = "
            SELECT COUNT(*) as total_completed
            FROM tasks
            WHERE accepted_applicant_id = ?
              AND accepted_applicant_id IS NOT NULL
              AND status = 'completed'
              AND escrow_status = 'completed'
        ";
        $stmtCompleted = $conn->prepare($sqlCompleted);
        if ($stmtCompleted === false) {
            throw new Exception('Error al preparar consulta de tareas completadas: ' . $conn->error);
        }
        $stmtCompleted->bind_param("i", $userId);
        $stmtCompleted->execute();
        $resCompleted = $stmtCompleted->get_result();
        if ($resCompleted === false) {
            throw new Exception('Error al ejecutar consulta de tareas completadas: ' . $stmtCompleted->error);
        }
        $completedRow = $resCompleted->fetch_assoc();
        $tasksCompleted = (int)$completedRow['total_completed'];
        $stmtCompleted->close();

        // Tareas creadas como cliente
        $sqlCreated = "
            SELECT COUNT(*) as total_created
            FROM tasks
            WHERE user_id = ?
        ";
        $stmtCreated = $conn->prepare($sqlCreated);
        if ($stmtCreated === false) {
            throw new Exception('Error al preparar consulta de tareas creadas: ' . $conn->error);
        }
        $stmtCreated->bind_param("i", $userId);
        $stmtCreated->execute();
        $resCreated = $stmtCreated->get_result();
        $createdRow = $resCreated->fetch_assoc();
        $tasksCreated = (int)$createdRow['total_created'];
        $stmtCreated->close();

        // Total ganado como trabajador
        // IMPORTANTE: price es lo que recibe el trabajador después de la comisión
        // Verificar si existe escrow_amount o escrow_platform_fee para cálculo más preciso
        $checkEscrowAmount = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_amount'");
        $hasEscrowAmount = $checkEscrowAmount && $checkEscrowAmount->num_rows > 0;
        $checkEscrowPlatformFee = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_platform_fee'");
        $hasEscrowPlatformFee = $checkEscrowPlatformFee && $checkEscrowPlatformFee->num_rows > 0;
        
        // Si existe escrow_amount y escrow_platform_fee, calcular: escrow_amount - (escrow_amount * escrow_platform_fee)
        // Si no, usar price directamente (ya es el monto después de comisión)
        if ($hasEscrowAmount && $hasEscrowPlatformFee) {
            $sqlEarned = "
                SELECT COALESCE(
                    SUM(
                        COALESCE(
                            price,
                            escrow_amount * (1 - COALESCE(escrow_platform_fee, ?))
                        )
                    ),
                    0
                ) as total_earned
                FROM tasks
                WHERE accepted_applicant_id = ?
                  AND accepted_applicant_id IS NOT NULL
                  AND status = 'completed'
                  AND escrow_status = 'completed'
            ";
        } else {
            // Usar price directamente (ya incluye el descuento de comisión)
            $sqlEarned = "
                SELECT COALESCE(SUM(price), 0) as total_earned
                FROM tasks
                WHERE accepted_applicant_id = ?
                  AND accepted_applicant_id IS NOT NULL
                  AND status = 'completed'
                  AND escrow_status = 'completed'
            ";
        }
        
        $stmtEarned = $conn->prepare($sqlEarned);
        if ($stmtEarned === false) {
            throw new Exception('Error al preparar consulta de total_earned: ' . $conn->error);
        }
        
        // Bind parameters según la consulta
        if ($hasEscrowAmount && $hasEscrowPlatformFee) {
            $stmtEarned->bind_param("di", $platformFeeEscaped, $userId);
        } else {
            $stmtEarned->bind_param("i", $userId);
        }
        
        $stmtEarned->execute();
        $resEarned = $stmtEarned->get_result();
        if ($resEarned === false) {
            throw new Exception('Error al ejecutar consulta de total_earned: ' . $stmtEarned->error);
        }
        $earnedRow = $resEarned->fetch_assoc();
        $totalEarned = (float)$earnedRow['total_earned'];
        $stmtEarned->close();

        // Total gastado como cliente (lo que pagó el cliente)
        // Reusar variables ya obtenidas arriba
        
        if ($hasEscrowAmount) {
            if ($hasEscrowPlatformFee) {
                $sqlSpent = "
                    SELECT COALESCE(
                        SUM(
                            COALESCE(
                                escrow_amount,
                                price / (1 - COALESCE(escrow_platform_fee, ?))
                            )
                        ),
                        0
                    ) as total_spent
                    FROM tasks
                    WHERE user_id = ?
                      AND status = 'completed'
                      AND escrow_status = 'completed'
                ";
            } else {
                $sqlSpent = "
                    SELECT COALESCE(
                        SUM(
                            COALESCE(
                                escrow_amount,
                                price / (1 - ?)
                            )
                        ),
                        0
                    ) as total_spent
                    FROM tasks
                    WHERE user_id = ?
                      AND status = 'completed'
                      AND escrow_status = 'completed'
                ";
            }
        } else {
            $sqlSpent = "
                SELECT COALESCE(
                    SUM(price / (1 - ?)),
                    0
                ) as total_spent
                FROM tasks
                WHERE user_id = ?
                  AND status = 'completed'
                  AND escrow_status = 'completed'
            ";
        }
        
        $stmtSpent = $conn->prepare($sqlSpent);
        if ($stmtSpent === false) {
            throw new Exception('Error al preparar consulta de total_spent: ' . $conn->error);
        }
        
        // Bind parameters según la consulta construida
        if ($hasEscrowAmount) {
            if ($hasEscrowPlatformFee) {
                // Tiene escrow_amount y escrow_platform_fee: necesita platformFee y userId
                $stmtSpent->bind_param("di", $platformFeeEscaped, $userId);
            } else {
                // Tiene escrow_amount pero no escrow_platform_fee: necesita platformFee y userId
                $stmtSpent->bind_param("di", $platformFeeEscaped, $userId);
            }
        } else {
            // No tiene escrow_amount: necesita platformFee y userId
            $stmtSpent->bind_param("di", $platformFeeEscaped, $userId);
        }
        
        $stmtSpent->execute();
        $resSpent = $stmtSpent->get_result();
        $spentRow = $resSpent->fetch_assoc();
        $totalSpent = (float)$spentRow['total_spent'];
        $stmtSpent->close();

        // Rating promedio y total de ratings desde tabla users (si existe)
        $avgRating = 0.0;
        $totalRatings = 0;
        $completionRate = 0.0;
        $responseTimeAvg = null;

        $stmtUser = $conn->prepare("
            SELECT average_rating, total_ratings
            FROM users
            WHERE id = ?
        ");
        if ($stmtUser) {
            $stmtUser->bind_param("i", $userId);
            $stmtUser->execute();
            $resUser = $stmtUser->get_result();
            if ($rowU = $resUser->fetch_assoc()) {
                if ($rowU['average_rating'] !== null) {
                    $avgRating = (float)$rowU['average_rating'];
                }
                if ($rowU['total_ratings'] !== null) {
                    $totalRatings = (int)$rowU['total_ratings'];
                }
            }
            $stmtUser->close();
        }

        // Calcular completion_rate si se requieren valores básicos
        if ($tasksCreated > 0) {
            // Tareas creadas que llegaron a completed
            $sqlCompletedAsClient = "
                SELECT COUNT(*) as total
                FROM tasks
                WHERE user_id = ?
                  AND status = 'completed'
                  AND escrow_status = 'completed'
            ";
            $stmtCC = $conn->prepare($sqlCompletedAsClient);
            if ($stmtCC) {
                $stmtCC->bind_param("i", $userId);
                $stmtCC->execute();
                $resCC = $stmtCC->get_result();
                $rowCC = $resCC->fetch_assoc();
                $completedAsClient = (int)$rowCC['total'];
                $completionRate = $tasksCreated > 0 ? round(($completedAsClient / $tasksCreated) * 100, 2) : 0.0;
                $stmtCC->close();
            }
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'stats' => [
                'tasks_completed'   => $tasksCompleted,
                'tasks_created'     => $tasksCreated,
                'total_earned'      => $totalEarned,
                'total_spent'       => $totalSpent,
                'average_rating'    => $avgRating,
                'total_ratings'     => $totalRatings,
                'completion_rate'   => $completionRate,
                'response_time_avg' => $responseTimeAvg
            ]
        ]);

    } catch (Exception $e) {
        error_log("Error en get_user_public_stats.php: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener estadísticas públicas del usuario: ' . $e->getMessage()
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
