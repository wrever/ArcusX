<?php
/**
 * Endpoint para guardar una transacción XDR parcialmente firmada
 * Se usa cuando el primer firmante (cliente o trabajador) firma la transacción
 * El segundo firmante completará la firma después
 */

// Deshabilitar display_errors para evitar output antes de headers
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

// CORS headers - DEBEN IR PRIMERO, ANTES DE CUALQUIER OTRO OUTPUT
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://arcusx.one',
    'http://arcusx.one'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Manejar preflight OPTIONS request PRIMERO
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
    header("Access-Control-Allow-Methods: POST, OPTIONS");
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
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        return null;
    }
    $authHeader = $headers['Authorization'];
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return null;
    }
    $jwt = $matches[1];
    try {
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        if (isset($decoded->data->id)) {
            return (string) $decoded->data->id;
        }
        return null;
    } catch (Exception $e) {
        error_log("JWT Error in save_pending_transaction.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $taskId = $data['task_id'] ?? null;
    $signedTxXdr = $data['signed_tx_xdr'] ?? null;
    $signerRole = $data['signer_role'] ?? null; // 'client', 'worker', 'both', o 'delete'

    error_log("save_pending_transaction.php - Datos recibidos: task_id=" . ($taskId ?? 'null') . ", signer_role=" . ($signerRole ?? 'null') . ", signed_tx_xdr_length=" . (isset($signedTxXdr) && $signedTxXdr !== null ? strlen($signedTxXdr) : 0));

    if (!$taskId) {
        error_log("save_pending_transaction.php - Faltan datos requeridos: task_id");
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'task_id es requerido']);
        exit;
    }

    // Asegurar que taskId sea un entero
    $taskId = intval($taskId);
    error_log("save_pending_transaction.php - taskId convertido a int: $taskId");

    // Caso especial: eliminar transacción pendiente (signed_tx_xdr vacío/null y signer_role = 'delete')
    $isDeleteRequest = ($signedTxXdr === '' || $signedTxXdr === null) && $signerRole === 'delete';
    
    if (!$isDeleteRequest) {
        // Validaciones normales para guardar transacción
        if (!$signedTxXdr || !$signerRole) {
            error_log("save_pending_transaction.php - Faltan datos requeridos: signed_tx_xdr o signer_role");
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'signed_tx_xdr y signer_role son requeridos']);
            exit;
        }

        // Aceptar 'client', 'worker' o 'both' (cuando ambas firmas están completas)
        if (!in_array($signerRole, ['client', 'worker', 'both'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'signer_role debe ser "client", "worker" o "both"']);
            exit;
        }
    }

    $conn->begin_transaction();

    try {
        // Verificar que la tarea existe y el usuario tiene permiso
        error_log("save_pending_transaction.php - Buscando tarea con id: $taskId");
        $stmt = $conn->prepare("
            SELECT user_id, accepted_applicant_id, escrow_id, status, 
                   client_accepted_completion, worker_accepted_completion
            FROM tasks 
            WHERE id = ? 
            FOR UPDATE
        ");
        if ($stmt === false) {
            error_log("save_pending_transaction.php - Error preparando consulta: " . $conn->error);
            throw new Exception('Error al preparar la consulta: ' . $conn->error);
        }
        $stmt->bind_param("i", $taskId);
        if (!$stmt->execute()) {
            error_log("save_pending_transaction.php - Error ejecutando consulta: " . $stmt->error);
            throw new Exception('Error al ejecutar la consulta: ' . $stmt->error);
        }
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            error_log("save_pending_transaction.php - Tarea no encontrada con id: $taskId");
            // Verificar si la tarea existe sin FOR UPDATE para debugging
            $stmt_debug = $conn->prepare("SELECT id FROM tasks WHERE id = ?");
            $stmt_debug->bind_param("i", $taskId);
            $stmt_debug->execute();
            $result_debug = $stmt_debug->get_result();
            if ($result_debug->num_rows === 0) {
                error_log("save_pending_transaction.php - Tarea realmente no existe en la base de datos");
            } else {
                error_log("save_pending_transaction.php - Tarea existe pero no se pudo obtener con FOR UPDATE (posible bloqueo)");
            }
            $stmt_debug->close();
            throw new Exception('Tarea no encontrada');
        }
        
        error_log("save_pending_transaction.php - Tarea encontrada exitosamente");

        $taskData = $result->fetch_assoc();
        $stmt->close();

        // Si es una solicitud de eliminación, verificar que el usuario es el cliente o el trabajador
        if ($isDeleteRequest) {
            $isClient = $taskData['user_id'] == $loggedInUserId;
            $isWorker = $taskData['accepted_applicant_id'] == $loggedInUserId;
            if (!$isClient && !$isWorker) {
                throw new Exception('No tienes permisos para eliminar la transacción pendiente');
            }
        } else {
            // Verificar permisos según el rol (solo para guardar transacciones, no para eliminar)
            if ($signerRole === 'client' && $taskData['user_id'] != $loggedInUserId) {
                throw new Exception('No tienes permisos para firmar como cliente');
            }
            if ($signerRole === 'worker' && $taskData['accepted_applicant_id'] != $loggedInUserId) {
                throw new Exception('No tienes permisos para firmar como trabajador');
            }
        }

        // Si es una solicitud de eliminación, no necesitamos validar aceptaciones ni escrow
        if (!$isDeleteRequest) {
            // IMPORTANTE: Solo validar que ambos aceptaron si se está guardando como 'both' (completamente firmada)
            // Permitir primera firma (signer_role = 'client' o 'worker') incluso si el otro no ha aceptado aún
            // Esto permite que cada participante firme cuando acepta, sin esperar al otro
            if ($signerRole === 'both') {
                // Solo cuando se guarda como 'both' (transacción completamente firmada), verificar que ambos aceptaron
                $clientAccepted = $taskData['client_accepted_completion'] == 1;
                $workerAccepted = $taskData['worker_accepted_completion'] == 1;
                
                if (!$clientAccepted || !$workerAccepted) {
                    throw new Exception('Ambos participantes deben aceptar la finalización antes de liberar fondos');
                }
            }
            // Si signer_role es 'client' o 'worker', permitir guardar primera firma sin requerir ambos aceptados

            // Verificar que hay un escrow configurado
            if (empty($taskData['escrow_id'])) {
                throw new Exception('No hay escrow configurado para esta tarea');
            }
        }

        // Verificar si existe la columna pending_transaction_xdr
        $checkColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'pending_transaction_xdr'");
        if ($checkColumn->num_rows === 0) {
            $conn->query("ALTER TABLE tasks ADD COLUMN pending_transaction_xdr TEXT NULL AFTER escrow_secret");
        }

        // Verificar si existe la columna pending_transaction_signer
        $checkColumn2 = $conn->query("SHOW COLUMNS FROM tasks LIKE 'pending_transaction_signer'");
        if ($checkColumn2->num_rows === 0) {
            $conn->query("ALTER TABLE tasks ADD COLUMN pending_transaction_signer VARCHAR(20) NULL AFTER pending_transaction_xdr");
        }

        // Si es una solicitud de eliminación, limpiar la transacción pendiente
        if ($isDeleteRequest) {
            $stmt = $conn->prepare("
                UPDATE tasks 
                SET pending_transaction_xdr = NULL, 
                    pending_transaction_signer = NULL
                WHERE id = ?
            ");
            $stmt->bind_param("i", $taskId);
            $stmt->execute();
            $stmt->close();
            
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Transacción pendiente eliminada exitosamente'
            ]);
            return;
        }

        // Guardar XDR parcialmente firmado
        $stmt = $conn->prepare("
            UPDATE tasks 
            SET pending_transaction_xdr = ?, 
                pending_transaction_signer = ?
            WHERE id = ?
        ");
        $stmt->bind_param("ssi", $signedTxXdr, $signerRole, $taskId);
        $stmt->execute();
        $stmt->close();

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Transacción parcialmente firmada guardada exitosamente'
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        error_log('Error en save_pending_transaction.php: ' . $e->getMessage());
        
        // Asegurar que los headers CORS se envíen incluso en caso de error
        if (!headers_sent()) {
            if (in_array($origin, $allowed_origins)) {
                header("Access-Control-Allow-Origin: $origin");
                header("Access-Control-Allow-Credentials: true");
            }
            header("Content-Type: application/json; charset=UTF-8");
        }
        
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    if (isset($conn) && $conn) {
        $conn->close();
    }
} else {
    // Asegurar que los headers CORS se envíen incluso para métodos no permitidos
    if (!headers_sent()) {
        if (in_array($origin, $allowed_origins)) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
        }
        header("Content-Type: application/json; charset=UTF-8");
    }
    
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>

