<?php
// select_proposal.php

require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');
arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

// Habilitar logs (pero NO mostrar errores en pantalla para evitar output antes de headers)
ini_set('display_errors', 0); // Cambiado a 0 para evitar output antes de headers
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');
error_log("=== Iniciando select_proposal.php ===");
error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("REQUEST_URI: " . $_SERVER['REQUEST_URI']);
error_log('ORIGIN: ' . ($_SERVER['HTTP_ORIGIN'] ?? ''));

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $jwtUid = arcusx_jwt_user_id();
    if ($jwtUid === null) {
        error_log("ERROR: Token JWT inválido o no proporcionado");
        if (!headers_sent()) {
            header("Content-Type: application/json; charset=UTF-8");
        }
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado: Token JWT no proporcionado o inválido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $loggedInUserId = (string) $jwtUid;

    error_log("Usuario autenticado: " . $loggedInUserId);

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['task_id']) || !isset($data['proposal_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $taskId = intval($data['task_id']);
    $proposalId = intval($data['proposal_id']);
    $taskIdInt = $taskId;
    $proposalIdInt = $proposalId;
    $loggedInUserIdInt = (int)$loggedInUserId;
    
    // Nuevos parámetros opcionales para transacción
    $transactionHash = isset($data['transaction_hash']) ? trim($data['transaction_hash']) : null;
    $escrowId = isset($data['escrow_id']) ? trim($data['escrow_id']) : null;
    
    error_log("Datos recibidos - taskId: $taskIdInt, proposalId: $proposalIdInt, transactionHash: " . ($transactionHash ?: 'null') . ", escrowId: " . ($escrowId ?: 'null') . ", userId: $loggedInUserIdInt");
    
    // Validar escrow_id (puede ser dirección Stellar o contractId de Trustless Work)
    if ($escrowId) {
        $isStellarAddress = (strlen($escrowId) === 56 && substr($escrowId, 0, 1) === 'G');
        $isTrustlessContractId = (strlen($escrowId) >= 32 && strlen($escrowId) <= 64); // ContractId puede variar
        
        if (!$isStellarAddress && !$isTrustlessContractId) {
            error_log("Error: escrow_id inválido (no es dirección Stellar ni contractId de Trustless Work): $escrowId");
            if (!headers_sent()) {
                header("Content-Type: application/json; charset=UTF-8");
            }
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'escrow_id inválido'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $conn->begin_transaction();

    try {
        // 1. Verificar que la tarea existe y pertenece al usuario logueado
        $stmt_check_task = $conn->prepare("SELECT id, status FROM tasks WHERE id = ? AND user_id = ? FOR UPDATE");
        if ($stmt_check_task === false) {
            throw new Exception('Error al preparar la verificación de tarea: ' . $conn->error);
        }
        $stmt_check_task->bind_param("ii", $taskIdInt, $loggedInUserIdInt);
        if (!$stmt_check_task->execute()) {
            throw new Exception('Error al verificar la tarea: ' . $stmt_check_task->error);
        }
        $result_check_task = $stmt_check_task->get_result();
        if ($result_check_task->num_rows === 0) {
            error_log("ERROR: Tarea no encontrada - taskId: $taskIdInt, userId: $loggedInUserIdInt");
            // Intentar buscar la tarea sin el filtro de user_id para debugging
            $stmt_debug = $conn->prepare("SELECT id, user_id, status FROM tasks WHERE id = ?");
            $stmt_debug->bind_param("i", $taskIdInt);
            $stmt_debug->execute();
            $result_debug = $stmt_debug->get_result();
            if ($result_debug->num_rows > 0) {
                $debug_data = $result_debug->fetch_assoc();
                error_log("DEBUG: Tarea existe pero user_id no coincide. Tarea user_id: " . $debug_data['user_id'] . ", Logged userId: $loggedInUserIdInt");
            } else {
                error_log("DEBUG: Tarea con ID $taskIdInt no existe en la BD");
            }
            $stmt_debug->close();
            
            if (!headers_sent()) {
                header("Content-Type: application/json; charset=UTF-8");
            }
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea o propuesta no encontrada'], JSON_UNESCAPED_UNICODE);
            $conn->rollback();
            exit;
        }
        $task_data = $result_check_task->fetch_assoc();
        error_log("Estado actual de la tarea: " . $task_data['status']);
        // Permitir que la tarea esté en estado 'open' o 'assigned' (porque el escrow ya se creó)
        // El estado 'assigned' se establece cuando se selecciona la propuesta, pero el escrow se crea antes
        if ($task_data['status'] !== 'open' && $task_data['status'] !== 'assigned') {
            error_log("ERROR: Tarea no está en estado válido. Estado actual: " . $task_data['status']);
            if (!headers_sent()) {
                header("Content-Type: application/json; charset=UTF-8");
            }
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'La tarea ya no está disponible. Estado actual: ' . $task_data['status']], JSON_UNESCAPED_UNICODE);
            $conn->rollback();
            exit;
        }

        // 2. Verificar que la propuesta existe y pertenece a la tarea (incluyendo worker_wallet_address)
        $stmt_check_proposal = $conn->prepare("SELECT id, applicant_id, worker_wallet_address FROM applications WHERE id = ? AND task_id = ? FOR UPDATE");
        if ($stmt_check_proposal === false) {
            throw new Exception('Error al preparar la verificación de propuesta: ' . $conn->error);
        }
        $stmt_check_proposal->bind_param("ii", $proposalIdInt, $taskIdInt);
        if (!$stmt_check_proposal->execute()) {
            throw new Exception('Error al verificar la propuesta: ' . $stmt_check_proposal->error);
        }
        $result_check_proposal = $stmt_check_proposal->get_result();
        if ($result_check_proposal->num_rows === 0) {
            error_log("ERROR: Propuesta no encontrada - proposalId: $proposalIdInt, taskId: $taskIdInt");
            // Intentar buscar la propuesta sin el filtro de task_id para debugging
            $stmt_debug_prop = $conn->prepare("SELECT id, task_id FROM applications WHERE id = ?");
            $stmt_debug_prop->bind_param("i", $proposalIdInt);
            $stmt_debug_prop->execute();
            $result_debug_prop = $stmt_debug_prop->get_result();
            if ($result_debug_prop->num_rows > 0) {
                $debug_prop_data = $result_debug_prop->fetch_assoc();
                error_log("DEBUG: Propuesta existe pero task_id no coincide. Propuesta task_id: " . $debug_prop_data['task_id'] . ", Requested taskId: $taskIdInt");
            } else {
                error_log("DEBUG: Propuesta con ID $proposalIdInt no existe en la BD");
            }
            $stmt_debug_prop->close();
            
            if (!headers_sent()) {
                header("Content-Type: application/json; charset=UTF-8");
            }
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tarea o propuesta no encontrada'], JSON_UNESCAPED_UNICODE);
            $conn->rollback();
            exit;
        }
        $proposal_data = $result_check_proposal->fetch_assoc();
        $applicantId = $proposal_data['applicant_id'];

        // 3. Obtener la wallet address del trabajador desde la propuesta (applications.worker_wallet_address)
        $worker_wallet_address = $proposal_data['worker_wallet_address'] ?? null;
        
        // Si no está en la propuesta, intentar obtenerla de la tabla users como fallback
        if (empty($worker_wallet_address)) {
            error_log("⚠️ worker_wallet_address no encontrada en la propuesta, buscando en users...");
        $stmt_get_wallet = $conn->prepare("SELECT wallet_address FROM users WHERE id = ?");
        if ($stmt_get_wallet === false) {
            throw new Exception('Error al preparar la consulta de wallet: ' . $conn->error);
        }
        $stmt_get_wallet->bind_param("i", $applicantId);
        if (!$stmt_get_wallet->execute()) {
            throw new Exception('Error al obtener wallet del trabajador: ' . $stmt_get_wallet->error);
        }
        $result_wallet = $stmt_get_wallet->get_result();
            if ($result_wallet->num_rows > 0) {
        $wallet_data = $result_wallet->fetch_assoc();
                $worker_wallet_address = $wallet_data['wallet_address'] ?? null;
            }
            $stmt_get_wallet->close();
        }

        // Verificar que el trabajador tenga wallet configurada
        if (empty($worker_wallet_address)) {
            throw new Exception('El trabajador no tiene wallet configurada. Debe configurar su wallet antes de poder trabajar.');
        }
        
        error_log("✅ Wallet del trabajador encontrada: $worker_wallet_address");

        // 4. Actualizar el estado de la tarea asociada a 'assigned' Y establecer el accepted_applicant_id
        $new_task_status = 'assigned';
        $applicantIdInt = (int)$applicantId;
        
        // Si hay información de transacción y escrow, actualizar también el escrow
        if ($transactionHash && $escrowId) {
            error_log("Actualizando tarea CON escrow: escrowId=$escrowId, txHash=$transactionHash");
            
            // Verificar que las columnas existan antes de actualizar
            try {
                $checkEscrowColumns = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_status'");
                if ($checkEscrowColumns === false) {
                    error_log("Error verificando columna escrow_status: " . $conn->error);
                } elseif ($checkEscrowColumns->num_rows === 0) {
                    error_log("Columna escrow_status no existe, creándola...");
                    $alterResult = $conn->query("ALTER TABLE tasks ADD COLUMN escrow_status VARCHAR(20) NULL AFTER escrow_id");
                    if ($alterResult === false) {
                        error_log("Error creando columna escrow_status: " . $conn->error);
                        throw new Exception('Error al crear columna escrow_status: ' . $conn->error);
                    }
                    error_log("Columna escrow_status creada exitosamente");
                }
                
                $checkEscrowCreatedAt = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_created_at'");
                if ($checkEscrowCreatedAt === false) {
                    error_log("Error verificando columna escrow_created_at: " . $conn->error);
                } elseif ($checkEscrowCreatedAt->num_rows === 0) {
                    error_log("Columna escrow_created_at no existe, creándola...");
                    $alterResult = $conn->query("ALTER TABLE tasks ADD COLUMN escrow_created_at DATETIME NULL AFTER escrow_status");
                    if ($alterResult === false) {
                        error_log("Error creando columna escrow_created_at: " . $conn->error);
                        throw new Exception('Error al crear columna escrow_created_at: ' . $conn->error);
                    }
                    error_log("Columna escrow_created_at creada exitosamente");
                }
            } catch (Exception $e) {
                error_log("Error verificando/creando columnas: " . $e->getMessage());
                throw $e;
            }
            
            $stmt_update_task = $conn->prepare("UPDATE tasks SET status = ?, accepted_applicant_id = ?, escrow_id = ?, escrow_status = 'active', escrow_created_at = NOW() WHERE id = ? AND user_id = ?");
            if ($stmt_update_task === false) { 
                error_log("Error preparando UPDATE con escrow: " . $conn->error);
                throw new Exception('Error al preparar la actualización de tarea: ' . $conn->error); 
            }
            
            // Verificar que los valores sean correctos antes de bind
            error_log("Valores para bind_param: status=$new_task_status, applicantId=$applicantIdInt, escrowId=$escrowId, taskId=$taskIdInt, userId=$loggedInUserIdInt");
            
            $bindResult = $stmt_update_task->bind_param("sissi", $new_task_status, $applicantIdInt, $escrowId, $taskIdInt, $loggedInUserIdInt);
            if ($bindResult === false) {
                error_log("Error en bind_param: " . $stmt_update_task->error);
                throw new Exception('Error al vincular parámetros: ' . $stmt_update_task->error);
            }
            
            error_log("Ejecutando UPDATE con escrow...");
        } else {
            error_log("Actualizando tarea SIN escrow");
            $stmt_update_task = $conn->prepare("UPDATE tasks SET status = ?, accepted_applicant_id = ? WHERE id = ? AND user_id = ?");
            if ($stmt_update_task === false) { 
                error_log("Error preparando UPDATE sin escrow: " . $conn->error);
                throw new Exception('Error al preparar la actualización de tarea: ' . $conn->error); 
            }
            $bindResult = $stmt_update_task->bind_param("siii", $new_task_status, $applicantIdInt, $taskIdInt, $loggedInUserIdInt);
            if ($bindResult === false) {
                error_log("Error en bind_param: " . $stmt_update_task->error);
                throw new Exception('Error al vincular parámetros: ' . $stmt_update_task->error);
            }
        }
        
        if (!$stmt_update_task->execute()) { 
            error_log("Error ejecutando UPDATE: " . $stmt_update_task->error);
            throw new Exception('Error al actualizar la tarea: ' . $stmt_update_task->error); 
        }
        $stmt_update_task->close();
        error_log("Task ID " . $taskIdInt . " updated to " . $new_task_status . ", accepted_applicant_id set to " . $applicantIdInt);

        // 5. Actualizar el estado de la propuesta seleccionada
        $proposalIdInt = (int)$proposalId;
        $stmt_update_proposal = $conn->prepare("UPDATE applications SET status = 'accepted' WHERE id = ?");
        if ($stmt_update_proposal === false) {
            throw new Exception('Error al preparar la actualización de propuesta: ' . $conn->error);
        }
        $stmt_update_proposal->bind_param("i", $proposalIdInt);
        if (!$stmt_update_proposal->execute()) {
            throw new Exception('Error al actualizar la propuesta: ' . $stmt_update_proposal->error);
        }

        // 6. Marcar todas las demás propuestas como 'rejected'
        $stmt_reject_others = $conn->prepare("UPDATE applications SET status = 'rejected' WHERE task_id = ? AND id != ?");
        if ($stmt_reject_others === false) {
            throw new Exception('Error al preparar el rechazo de otras propuestas: ' . $conn->error);
        }
        $stmt_reject_others->bind_param("ii", $taskIdInt, $proposalIdInt);
        if (!$stmt_reject_others->execute()) {
            throw new Exception('Error al rechazar otras propuestas: ' . $stmt_reject_others->error);
        }

        // 7. Eliminar todas las propuestas marcadas como 'rejected'
        $stmt_delete_rejected = $conn->prepare("DELETE FROM applications WHERE task_id = ? AND status = 'rejected'");
        if ($stmt_delete_rejected === false) {
            throw new Exception('Error al preparar la eliminación de propuestas rechazadas: ' . $conn->error);
        }
        $stmt_delete_rejected->bind_param("i", $taskIdInt);
        if (!$stmt_delete_rejected->execute()) {
            throw new Exception('Error al eliminar propuestas rechazadas: ' . $stmt_delete_rejected->error);
        }

        $conn->commit();

        $response = [
            'success' => true,
            'message' => 'Propuesta seleccionada exitosamente.',
            'task_id' => $taskIdInt,
            'proposal_id' => $proposalIdInt,
            'applicant_id' => $applicantIdInt,
            'worker_wallet_address' => $worker_wallet_address
        ];
        
        // Agregar información del escrow si está disponible
        if ($transactionHash && $escrowId) {
            $response['escrow_info'] = [
                'escrow_id' => $escrowId,
                'transaction_hash' => $transactionHash,
                'status' => 'active',
                'network' => 'testnet'
            ];
        }
        
        // Asegurar que los headers se envíen correctamente
        if (!headers_sent()) {
            header("Content-Type: application/json; charset=UTF-8");
        }
        
        http_response_code(200);
        echo json_encode($response, JSON_UNESCAPED_UNICODE);

    } catch (Exception $e) {
        // Intentar hacer rollback si hay una transacción activa
        try {
            if (isset($conn) && $conn) {
        $conn->rollback();
            }
        } catch (Exception $rollbackError) {
            // Ignorar errores de rollback
            error_log('Error en rollback: ' . $rollbackError->getMessage());
        }
        
        error_log('Error en select_proposal.php: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        
        // Asegurar que los headers CORS se envíen incluso en caso de error
        // Pero solo si no se han enviado headers aún
        if (!headers_sent()) {
            header("Content-Type: application/json; charset=UTF-8");
        }
        
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }

    if (isset($conn) && $conn) {
    $conn->close();
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    error_log("Method not allowed: " . $_SERVER['REQUEST_METHOD']);
}
?>