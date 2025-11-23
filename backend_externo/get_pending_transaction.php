<?php
/**
 * Endpoint para obtener una transacción XDR parcialmente firmada
 * Se usa cuando el segundo firmante necesita completar la firma
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
    header("Access-Control-Allow-Methods: GET, OPTIONS");
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
header("Access-Control-Allow-Methods: GET, OPTIONS");
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
        error_log("JWT Error in get_pending_transaction.php: " . $e->getMessage());
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $loggedInUserId = getLoggedInUserId($conn, $secret_key);

    if (is_null($loggedInUserId)) {
        if (!headers_sent()) {
            if (in_array($origin, $allowed_origins)) {
                header("Access-Control-Allow-Origin: $origin");
                header("Access-Control-Allow-Credentials: true");
            }
            header("Content-Type: application/json; charset=UTF-8");
        }
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Acceso no autorizado']);
        exit;
    }

    $taskId = isset($_GET['task_id']) ? intval($_GET['task_id']) : null;

    if (!$taskId) {
        if (!headers_sent()) {
            if (in_array($origin, $allowed_origins)) {
                header("Access-Control-Allow-Origin: $origin");
                header("Access-Control-Allow-Credentials: true");
            }
            header("Content-Type: application/json; charset=UTF-8");
        }
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'task_id es requerido']);
        exit;
    }

    try {
        // Verificar que las columnas existan antes de consultar
        $checkColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'pending_transaction_xdr'");
        if ($checkColumn === false) {
            error_log("Error verificando columna pending_transaction_xdr: " . $conn->error);
        } elseif ($checkColumn->num_rows === 0) {
            error_log("Columna pending_transaction_xdr no existe, creándola...");
            // Verificar si existe escrow_secret para usar AFTER, sino agregar al final
            $checkEscrowSecret = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_secret'");
            if ($checkEscrowSecret && $checkEscrowSecret->num_rows > 0) {
                $alterResult = $conn->query("ALTER TABLE tasks ADD COLUMN pending_transaction_xdr TEXT NULL AFTER escrow_secret");
            } else {
                $alterResult = $conn->query("ALTER TABLE tasks ADD COLUMN pending_transaction_xdr TEXT NULL");
            }
            if ($alterResult === false) {
                error_log("Error creando columna pending_transaction_xdr: " . $conn->error);
                throw new Exception('Error al crear columna pending_transaction_xdr: ' . $conn->error);
            }
            error_log("Columna pending_transaction_xdr creada exitosamente");
        }
        
        $checkColumn2 = $conn->query("SHOW COLUMNS FROM tasks LIKE 'pending_transaction_signer'");
        if ($checkColumn2 === false) {
            error_log("Error verificando columna pending_transaction_signer: " . $conn->error);
        } elseif ($checkColumn2->num_rows === 0) {
            error_log("Columna pending_transaction_signer no existe, creándola...");
            // Verificar si existe pending_transaction_xdr para usar AFTER, sino agregar al final
            $checkPendingXdr = $conn->query("SHOW COLUMNS FROM tasks LIKE 'pending_transaction_xdr'");
            if ($checkPendingXdr && $checkPendingXdr->num_rows > 0) {
                $alterResult = $conn->query("ALTER TABLE tasks ADD COLUMN pending_transaction_signer VARCHAR(20) NULL AFTER pending_transaction_xdr");
            } else {
                $alterResult = $conn->query("ALTER TABLE tasks ADD COLUMN pending_transaction_signer VARCHAR(20) NULL");
            }
            if ($alterResult === false) {
                error_log("Error creando columna pending_transaction_signer: " . $conn->error);
                throw new Exception('Error al crear columna pending_transaction_signer: ' . $conn->error);
            }
            error_log("Columna pending_transaction_signer creada exitosamente");
        }

        // Verificar que la tarea existe y el usuario tiene permiso
        $stmt = $conn->prepare("
            SELECT user_id, accepted_applicant_id, pending_transaction_xdr, pending_transaction_signer, status
            FROM tasks 
            WHERE id = ?
        ");
        if ($stmt === false) {
            throw new Exception('Error al preparar la consulta: ' . $conn->error);
        }
        $stmt->bind_param("i", $taskId);
        if (!$stmt->execute()) {
            throw new Exception('Error al ejecutar la consulta: ' . $stmt->error);
        }
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            throw new Exception('Tarea no encontrada');
        }

        $taskData = $result->fetch_assoc();
        $stmt->close();

        // Verificar que el usuario es cliente o trabajador
        // Convertir a string para comparación segura
        $taskUserId = (string) $taskData['user_id'];
        $taskAcceptedApplicantId = $taskData['accepted_applicant_id'] ? (string) $taskData['accepted_applicant_id'] : null;
        $loggedInUserIdStr = (string) $loggedInUserId;
        
        $isClient = $taskUserId === $loggedInUserIdStr;
        $isWorker = $taskAcceptedApplicantId && $taskAcceptedApplicantId === $loggedInUserIdStr;

        error_log("Verificación de permisos - taskUserId: $taskUserId, taskAcceptedApplicantId: " . ($taskAcceptedApplicantId ?: 'null') . ", loggedInUserId: $loggedInUserIdStr, isClient: " . ($isClient ? 'true' : 'false') . ", isWorker: " . ($isWorker ? 'true' : 'false'));

        if (!$isClient && !$isWorker) {
            throw new Exception('No tienes permisos para acceder a esta transacción. Solo el cliente o trabajador asignado pueden acceder.');
        }

        // Verificar que hay una transacción pendiente
        if (empty($taskData['pending_transaction_xdr'])) {
            if (!headers_sent()) {
                if (in_array($origin, $allowed_origins)) {
                    header("Access-Control-Allow-Origin: $origin");
                    header("Access-Control-Allow-Credentials: true");
                }
                header("Content-Type: application/json; charset=UTF-8");
            }
            http_response_code(200);
            echo json_encode([
                'success' => false,
                'message' => 'No hay transacción pendiente para esta tarea',
                'has_pending' => false
            ]);
            exit;
        }

        // Verificar que el usuario actual NO es el que ya firmó
        $currentSigner = $taskData['pending_transaction_signer'] ?? null;
        
        if (empty($currentSigner)) {
            // No hay signer guardado, esto no debería pasar pero manejamos el caso
            if (!headers_sent()) {
                if (in_array($origin, $allowed_origins)) {
                    header("Access-Control-Allow-Origin: $origin");
                    header("Access-Control-Allow-Credentials: true");
                }
                header("Content-Type: application/json; charset=UTF-8");
            }
            http_response_code(200);
            echo json_encode([
                'success' => false,
                'message' => 'Error: No se encontró información del firmante en la transacción pendiente.',
                'has_pending' => false
            ]);
            exit;
        }
        
        if (($currentSigner === 'client' && $isClient) || ($currentSigner === 'worker' && $isWorker)) {
            if (!headers_sent()) {
                if (in_array($origin, $allowed_origins)) {
                    header("Access-Control-Allow-Origin: $origin");
                    header("Access-Control-Allow-Credentials: true");
                }
                header("Content-Type: application/json; charset=UTF-8");
            }
            http_response_code(200);
            echo json_encode([
                'success' => false,
                'message' => 'Ya has firmado esta transacción. Esperando la firma del otro participante.',
                'has_pending' => true,
                'waiting_for' => $currentSigner === 'client' ? 'worker' : 'client'
            ]);
            exit;
        }

        // Verificar si la transacción está completamente firmada (signer = 'both')
        if ($currentSigner === 'both') {
            // Transacción completamente firmada, lista para enviar
            if (!headers_sent()) {
                if (in_array($origin, $allowed_origins)) {
                    header("Access-Control-Allow-Origin: $origin");
                    header("Access-Control-Allow-Credentials: true");
                }
                header("Content-Type: application/json; charset=UTF-8");
            }
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'complete_tx_xdr' => $taskData['pending_transaction_xdr'],
                'signed_by' => 'both',
                'ready_to_submit' => true
            ]);
            exit;
        }
        
        // Retornar XDR parcialmente firmado
        if (!headers_sent()) {
            if (in_array($origin, $allowed_origins)) {
                header("Access-Control-Allow-Origin: $origin");
                header("Access-Control-Allow-Credentials: true");
            }
            header("Content-Type: application/json; charset=UTF-8");
        }
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'signed_tx_xdr' => $taskData['pending_transaction_xdr'],
            'signed_by' => $currentSigner,
            'needs_signature_from' => $isClient ? 'client' : 'worker'
        ]);

    } catch (Exception $e) {
        error_log('Error en get_pending_transaction.php: ' . $e->getMessage());
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

    $conn->close();
} else {
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

