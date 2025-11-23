<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
    exit;
}

// Incluir configuración de base de datos
require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$secret_key = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";

// Función para obtener usuario del JWT (igual que en select_proposal.php)
function getLoggedInUserId($conn, $secret_key) {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        error_log('Auth header missing');
        return null;
    }
    $authHeader = $headers['Authorization'];
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        error_log('Auth header format incorrect');
        return null;
    }
    $jwt = $matches[1];
    try {
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        error_log('Decoded JWT: ' . print_r($decoded, true));
        if (isset($decoded->data->id)) {
            return (string) $decoded->data->id;
        } else {
            error_log('User ID not found in JWT payload');
            return null;
        }
    } catch (\Firebase\JWT\ExpiredException $e) {
        error_log('JWT Expired: ' . $e->getMessage());
        return null;
    } catch (\Firebase\JWT\SignatureInvalidException $e) {
        error_log('JWT Signature Invalid: ' . $e->getMessage());
        return null;
    } catch (Exception $e) {
        error_log('Error decoding token: ' . $e->getMessage());
        return null;
    }
}

// Función para validar dirección Stellar
function isValidStellarAddress($address) {
    // Direcciones Stellar empiezan con G y tienen 56 caracteres
    return !empty($address) && 
           strlen($address) === 56 && 
           substr($address, 0, 1) === 'G' &&
           preg_match('/^G[A-Z0-9]{55}$/', $address);
}

try {
    // Log de inicio
    error_log("=== CREATE_ESCROW.PHP INICIADO ===");
    
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    error_log("Datos recibidos: " . json_encode($input));
    
    if (!$input) {
        error_log("ERROR: Datos JSON inválidos");
        http_response_code(400);
        echo json_encode(['message' => 'Datos JSON inválidos']);
        exit;
    }
    
    $taskId = $input['task_id'] ?? null;
    $proposalId = $input['proposal_id'] ?? null;
    $contractAddress = $input['contract_address'] ?? null;
    $transactionHash = $input['transaction_hash'] ?? null;
    
    // Verificar si es creación o confirmación de firma
    $isSignatureConfirmation = $contractAddress && $transactionHash;
    
    if (!$taskId) {
        http_response_code(400);
        echo json_encode(['message' => 'task_id es requerido']);
        exit;
    }
    
    if (!$isSignatureConfirmation && !$proposalId) {
        http_response_code(400);
        echo json_encode(['message' => 'proposal_id es requerido para crear escrow']);
        exit;
    }
    
    if ($isSignatureConfirmation && (!$contractAddress || !$transactionHash)) {
        http_response_code(400);
        echo json_encode(['message' => 'contract_address y transaction_hash son requeridos para confirmar firma']);
        exit;
    }
    
    // Verificar autenticación
    error_log("Verificando autenticación...");
    $clientId = getLoggedInUserId($conn, $secret_key);
    error_log("Client ID obtenido: " . ($clientId ? $clientId : 'NULL') . " (tipo: " . gettype($clientId) . ")");
    
    if (!$clientId) {
        error_log("ERROR: Token de autenticación inválido");
        http_response_code(401);
        echo json_encode(['message' => 'Token de autenticación inválido']);
        exit;
    }
    
    // Asegurar que clientId sea string para comparación consistente
    $clientId = (string)$clientId;
    
    if ($isSignatureConfirmation) {
        // CONFIRMAR FIRMA DEL CONTRATO
        // Verificar que la tarea existe y pertenece al cliente
        $stmt = $conn->prepare("
            SELECT t.id, t.escrow_id, t.escrow_status, t.accepted_applicant_id
            FROM tasks t
            WHERE t.id = ? AND t.user_id = ? AND t.escrow_status = 'pending_signature'
        ");
        $stmt->bind_param("ii", $taskId, $clientId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        error_log("Query confirmación ejecutada, filas encontradas: " . $result->num_rows);
        
        if ($result->num_rows === 0) {
            error_log("ERROR: Tarea no encontrada o ya procesada");
            error_log("Task ID: $taskId, Client ID: $clientId");
            
            // Intentar buscar la tarea sin filtro de escrow_status
            $stmt2 = $conn->prepare("
                SELECT t.id, t.escrow_id, t.escrow_status, t.accepted_applicant_id
                FROM tasks t
                WHERE t.id = ? AND t.user_id = ?
            ");
            $stmt2->bind_param("ii", $taskId, $clientId);
            $stmt2->execute();
            $result2 = $stmt2->get_result();
            
            error_log("Query sin filtro ejecutada, filas encontradas: " . $result2->num_rows);
            
            if ($result2->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Tarea no encontrada']);
                exit;
            } else {
                $taskData = $result2->fetch_assoc();
                error_log("Tarea encontrada con status: " . $taskData['escrow_status']);
                
                if ($taskData['escrow_status'] === 'active') {
                    http_response_code(400);
                    echo json_encode(['message' => 'El contrato ya está activo']);
                    exit;
                }
            }
        }
        
        $taskData = $result->fetch_assoc();
        
        // Verificar que el contrato coincide
        if ($taskData['escrow_id'] !== $contractAddress) {
            http_response_code(400);
            echo json_encode(['message' => 'Dirección del contrato no coincide']);
            exit;
        }
        
        // Verificar firma en blockchain (simulado)
        $verificationResult = [
            'success' => true,
            'verified' => true,
            'block_number' => rand(1000000, 9999999),
            'gas_used' => rand(100000, 500000)
        ];
        
        if (!$verificationResult['success'] || !$verificationResult['verified']) {
            http_response_code(400);
            echo json_encode(['message' => 'Firma del contrato no verificada']);
            exit;
        }
        
        // Actualizar estado del escrow a activo
        $stmt = $conn->prepare("
            UPDATE tasks 
            SET escrow_status = 'active',
                escrow_completed_at = NOW()
            WHERE id = ?
        ");
        $stmt->bind_param("i", $taskId);
        $stmt->execute();
        
        // Log de éxito
        error_log("Escrow firmado y activado - Task: $taskId, Contract: $contractAddress, TX: $transactionHash");
        
        // Respuesta exitosa
        echo json_encode([
            'success' => true,
            'message' => 'Contrato firmado y activado exitosamente',
            'contract_address' => $contractAddress,
            'transaction_hash' => $transactionHash,
            'block_number' => $verificationResult['block_number'],
            'gas_used' => $verificationResult['gas_used'],
            'status' => 'active'
        ]);
        
    } else {
        // CREAR CONTRATO ESCROW
        error_log("Creando contrato escrow...");
        error_log("Task ID: $taskId, Proposal ID: $proposalId");
        
        // Obtener datos de la tarea
        // NOTA: No requerimos status = 'accepted' porque el escrow se crea ANTES de seleccionar la propuesta
        // La propuesta se marcará como 'accepted' cuando se llame a select_proposal.php
        
        // Log detallado para debugging
        error_log("=== DEBUG CREATE_ESCROW ===");
        error_log("Task ID recibido: " . var_export($taskId, true) . " (tipo: " . gettype($taskId) . ")");
        error_log("Proposal ID recibido: " . var_export($proposalId, true) . " (tipo: " . gettype($proposalId) . ")");
        
        // Verificar si la tarea existe
        $stmt_check_task = $conn->prepare("SELECT id, user_id FROM tasks WHERE id = ?");
        $stmt_check_task->bind_param("i", $taskId);
        $stmt_check_task->execute();
        $result_check_task = $stmt_check_task->get_result();
        error_log("Tarea encontrada: " . $result_check_task->num_rows);
        if ($result_check_task->num_rows > 0) {
            $task_info = $result_check_task->fetch_assoc();
            error_log("Tarea info: id=" . $task_info['id'] . ", user_id=" . $task_info['user_id']);
        }
        
        // Verificar si la propuesta existe
        $stmt_check_proposal = $conn->prepare("SELECT id, task_id, status FROM applications WHERE id = ?");
        $stmt_check_proposal->bind_param("i", $proposalId);
        $stmt_check_proposal->execute();
        $result_check_proposal = $stmt_check_proposal->get_result();
        error_log("Propuesta encontrada: " . $result_check_proposal->num_rows);
        if ($result_check_proposal->num_rows > 0) {
            $proposal_info = $result_check_proposal->fetch_assoc();
            error_log("Propuesta info: id=" . $proposal_info['id'] . ", task_id=" . $proposal_info['task_id'] . ", status=" . $proposal_info['status']);
        }
        
        $stmt = $conn->prepare("
            SELECT t.id, t.title, t.price, t.currency, t.user_id as client_id,
                   a.worker_wallet_address, a.applicant_id as worker_id, a.status as proposal_status
            FROM tasks t
            JOIN applications a ON t.id = a.task_id
            WHERE t.id = ? AND a.id = ?
        ");
        $stmt->bind_param("ii", $taskId, $proposalId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        error_log("Query JOIN ejecutada, filas encontradas: " . $result->num_rows);
        
        if ($result->num_rows === 0) {
            error_log("ERROR: Tarea o propuesta no encontrada en JOIN");
            error_log("Intentando query alternativa sin JOIN...");
            
            // Query alternativa: buscar por separado
            $stmt_alt = $conn->prepare("
                SELECT t.id, t.title, t.price, t.currency, t.user_id as client_id
                FROM tasks t
                WHERE t.id = ?
            ");
            $stmt_alt->bind_param("i", $taskId);
            $stmt_alt->execute();
            $result_alt = $stmt_alt->get_result();
            
            if ($result_alt->num_rows === 0) {
                error_log("ERROR: Tarea no existe");
                http_response_code(404);
                echo json_encode(['message' => 'Tarea no encontrada']);
                exit;
            }
            
            $stmt_prop_alt = $conn->prepare("
                SELECT worker_wallet_address, applicant_id as worker_id, status as proposal_status
                FROM applications
                WHERE id = ? AND task_id = ?
            ");
            $stmt_prop_alt->bind_param("ii", $proposalId, $taskId);
            $stmt_prop_alt->execute();
            $result_prop_alt = $stmt_prop_alt->get_result();
            
            if ($result_prop_alt->num_rows === 0) {
                error_log("ERROR: Propuesta no existe o no pertenece a esta tarea");
                http_response_code(404);
                echo json_encode(['message' => 'Propuesta no encontrada o no pertenece a esta tarea']);
                exit;
            }
            
            // Combinar resultados manualmente
            $taskData = $result_alt->fetch_assoc();
            $proposalData = $result_prop_alt->fetch_assoc();
            $taskData = array_merge($taskData, $proposalData);
        } else {
            $taskData = $result->fetch_assoc();
        }
        
        // Verificar que el cliente es el dueño de la tarea
        // Convertir ambos a string para comparación consistente
        $taskClientId = (string)$taskData['client_id'];
        error_log("Comparando permisos: taskClientId=" . $taskClientId . " (tipo: " . gettype($taskData['client_id']) . ") vs clientId=" . $clientId . " (tipo: " . gettype($clientId) . ")");
        
        if ($taskClientId !== $clientId) {
            error_log("ERROR: Permisos denegados - clientId no coincide");
            error_log("Task client_id: " . var_export($taskData['client_id'], true));
            error_log("Logged in clientId: " . var_export($clientId, true));
            http_response_code(403);
            echo json_encode(['message' => 'No tienes permisos para crear el contrato escrow']);
            exit;
        }
        
        error_log("✅ Permisos verificados correctamente");
        
        // Obtener wallet del cliente: primero del payload, luego de la BD
        $clientWallet = $input['client_wallet_address'] ?? null;
        
        if (empty($clientWallet) || !isValidStellarAddress($clientWallet)) {
            // Si no viene en el payload o no es válida, buscar en la BD
            error_log("Wallet del cliente no viene en payload o no es válida, buscando en BD...");
            $stmt_get_client = $conn->prepare("SELECT wallet_address FROM users WHERE id = ?");
            $stmt_get_client->bind_param("i", $clientId);
            $stmt_get_client->execute();
            $result_client = $stmt_get_client->get_result();
            
            if ($result_client->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Cliente no encontrado']);
                exit;
            }
            
            $client_data = $result_client->fetch_assoc();
            $clientWallet = $client_data['wallet_address'];
        } else {
            error_log("✅ Wallet del cliente obtenida del payload: " . substr($clientWallet, 0, 8) . "...");
        }
        
        // Validar que el cliente tenga wallet configurada
        if (empty($clientWallet) || !isValidStellarAddress($clientWallet)) {
            error_log("ERROR: Wallet del cliente no válida. Wallet recibida: " . var_export($clientWallet, true));
            http_response_code(400);
            echo json_encode(['message' => 'El cliente no tiene una wallet Stellar válida configurada. Por favor, conecta tu wallet Stellar.']);
            exit;
        }
        
        error_log("✅ Wallet del cliente validada: " . substr($clientWallet, 0, 8) . "...");
        
        // Validar wallet del trabajador
        if (empty($taskData['worker_wallet_address']) || !isValidStellarAddress($taskData['worker_wallet_address'])) {
            http_response_code(400);
            echo json_encode(['message' => 'El trabajador no tiene una wallet Stellar válida configurada']);
            exit;
        }
        
        // El escrow_id debe venir del frontend (puede ser dirección Stellar o contractId de Trustless Work)
        $escrowId = $input['escrow_id'] ?? null;
        
        if (!$escrowId) {
            http_response_code(400);
            echo json_encode(['message' => 'Escrow ID requerido']);
            exit;
        }
        
        // Validar formato (puede ser dirección Stellar o contractId de Trustless Work)
        $isStellarAddress = isValidStellarAddress($escrowId);
        $isTrustlessContractId = (strlen($escrowId) >= 32 && strlen($escrowId) <= 64);
        
        if (!$isStellarAddress && !$isTrustlessContractId) {
            http_response_code(400);
            echo json_encode(['message' => 'Escrow ID inválido (debe ser dirección Stellar o contractId de Trustless Work)']);
            exit;
        }
        
        // Actualizar la tarea con información del escrow (PENDIENTE de fondeo)
        $stmt = $conn->prepare("
            UPDATE tasks 
            SET escrow_id = ?, 
                escrow_status = 'pending_funding',
                escrow_created_at = NOW()
            WHERE id = ?
        ");
        $stmt->bind_param("si", $escrowId, $taskId);
        $stmt->execute();
        
        // Log de éxito
        error_log("Escrow registrado exitosamente - Task: $taskId, Escrow: $escrowId");
        
        // Respuesta exitosa
        echo json_encode([
            'success' => true,
            'message' => 'Escrow registrado exitosamente',
            'escrow_id' => $escrowId,
            'network' => 'testnet',
            'status' => 'pending_funding'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Error en create_escrow.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['message' => 'Error interno del servidor']);
}
?>
