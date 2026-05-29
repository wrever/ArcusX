<?php
require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/referral_supabase.php';

// Verificar si el archivo autoload.php existe
$autoload_path = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_path)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: Falta la carpeta de dependencias (vendor).']);
    exit();
}

require $autoload_path;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['supabase_user_id']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit();
}

$supabase_user_id = $data['supabase_user_id'];
$email = $data['email'];
$name = $data['name'] ?? $email;
$avatar_url = $data['avatar_url'] ?? null;
$supabase_access_token = isset($data['supabase_access_token'])
    ? trim((string) $data['supabase_access_token'])
    : '';

if ($supabase_access_token === '') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sesión OAuth no válida', 'code' => 'missing_token']);
    exit();
}

if (!arcusx_supabase_auth_config()) {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'message' => 'Servidor sin configurar Supabase (ARCUSX_SUPABASE_URL y ANON o SERVICE_ROLE)',
        'code' => 'oauth_verify_not_configured',
    ]);
    exit();
}

if (!arcusx_verify_supabase_access_token($supabase_access_token, $supabase_user_id, $email)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sesión OAuth no válida', 'code' => 'token_verify_failed']);
    exit();
}

// Configuración JWT (centralizada; mismo secreto que validan los demás endpoints)
$secret_key = $jwt_secret;
$issuedAt = time();
$expirationTime = $issuedAt + (3600 * 24); // 1 día
$issuer = "arcusx.pro";

try {
    // Usuario existente: mismo email o mismo supabase_user_id (no cuenta como referido válido)
    $stmt = $conn->prepare("SELECT id, username, email, supabase_user_id FROM users WHERE email = ? OR supabase_user_id = ? LIMIT 1");
    $stmt->bind_param("ss", $email, $supabase_user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $existingUser = $result->fetch_assoc();

    $isNewUser = false;

    if ($existingUser) {
        // Usuario existe, actualizar supabase_user_id si no lo tiene
        $checkSupabaseStmt = $conn->prepare("SELECT supabase_user_id FROM users WHERE id = ?");
        $checkSupabaseStmt->bind_param("i", $existingUser['id']);
        $checkSupabaseStmt->execute();
        $supabaseResult = $checkSupabaseStmt->get_result();
        $userData = $supabaseResult->fetch_assoc();
        
        if (empty($userData['supabase_user_id'] ?? null)) {
            // Verificar si la columna existe, si no, agregarla
            $updateStmt = $conn->prepare("UPDATE users SET supabase_user_id = ? WHERE id = ?");
            if ($updateStmt) {
                $updateStmt->bind_param("si", $supabase_user_id, $existingUser['id']);
                $updateStmt->execute();
            }
        }
        
        $userId = $existingUser['id'];
        $username = $existingUser['username'];
    } else {
        $isNewUser = true;
        // Usuario no existe, crear nuevo usuario
        // Username legible: nombre saneado (o parte local del email). El sufijo _XXXXXXXX solo si ya existe otro igual.
        $providedUsername = isset($data['username']) ? trim((string) $data['username']) : '';
        if ($providedUsername !== '') {
            $base = strtolower(preg_replace('/[^a-zA-Z0-9._-]/', '', $providedUsername));
        } else {
            $base = strtolower(str_replace(' ', '', preg_replace('/[^a-zA-Z0-9]/', '', $name)));
        }
        if ($base === '' || strlen($base) < 2) {
            $localPart = explode('@', (string) $email)[0] ?? '';
            $base = strtolower(preg_replace('/[^a-zA-Z0-9._-]/', '', $localPart));
        }
        if ($base === '') {
            $base = 'user';
        }
        $base = substr($base, 0, 48);

        $idSuffix = substr(str_replace('-', '', $supabase_user_id), 0, 8);

        $checkStmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
        $candidate = $base;
        $checkStmt->bind_param("s", $candidate);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        if ($checkResult->num_rows === 0) {
            $username = $candidate;
        } else {
            $candidate = $base . '_' . $idSuffix;
            $checkStmt->bind_param("s", $candidate);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            if ($checkResult->num_rows === 0) {
                $username = $candidate;
            } else {
                $k = 2;
                do {
                    $candidate = $base . '_' . $idSuffix . '_' . $k;
                    $k++;
                    $checkStmt->bind_param("s", $candidate);
                    $checkStmt->execute();
                    $checkResult = $checkStmt->get_result();
                } while ($checkResult->num_rows > 0);
                $username = $candidate;
            }
        }

        // Intentar insertar con supabase_user_id y avatar_url si las columnas existen
        $insertStmt = $conn->prepare("INSERT INTO users (username, email, created_at) VALUES (?, ?, NOW())");
        if ($insertStmt) {
            $insertStmt->bind_param("ss", $username, $email);
            $insertStmt->execute();
            $userId = $conn->insert_id;
            
            // Si las columnas existen, actualizarlas
            if ($userId) {
                // Intentar actualizar supabase_user_id si la columna existe
                $updateSupabaseStmt = $conn->prepare("UPDATE users SET supabase_user_id = ? WHERE id = ?");
                if ($updateSupabaseStmt) {
                    $updateSupabaseStmt->bind_param("si", $supabase_user_id, $userId);
                    $updateSupabaseStmt->execute();
                }
            }
        } else {
            throw new Exception('Error al preparar la consulta de inserción');
        }
    }

    // Generar token JWT para el cliente (estructura habitual del backend)
    $payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'iss' => $issuer,
        'data' => [
            'id' => $userId,
            'username' => $username
        ]
    ];

    $jwt = JWT::encode($payload, $secret_key, 'HS256');

    $referralMeta = null;
    $deviceFp = isset($data['device_fp']) ? trim((string) $data['device_fp']) : '';
    $refCode = isset($data['ref_code']) ? arcusx_referral_normalize_code((string) $data['ref_code']) : '';
    if ($refCode === '' && !empty($_COOKIE['arcusx_ref_h'])) {
        $refCode = arcusx_referral_normalize_code((string) $_COOKIE['arcusx_ref_h']);
    }
    if ($refCode === '' && !empty($_COOKIE['arcusx_ref'])) {
        $refCode = arcusx_referral_normalize_code((string) $_COOKIE['arcusx_ref']);
    }
    if ($refCode === '' && $deviceFp !== '') {
        $pendingRef = arcusx_referral_lookup_pending($deviceFp);
        if ($pendingRef) {
            $refCode = $pendingRef;
        }
    }

    $shouldAttribute = $refCode !== '' || $deviceFp !== '';
    if ($shouldAttribute) {
        $referralResult = arcusx_referral_attribute_signup([
            'ref_code' => $refCode,
            'supabase_user_id' => $supabase_user_id,
            'mysql_user_id' => (int) $userId,
            'email' => $email,
            'is_new_user' => $isNewUser,
            'signup_ip' => arcusx_referral_client_ip(),
            'device_fp' => $deviceFp,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'oauth_provider' => $data['oauth_provider'] ?? '',
            'oauth_subject' => $data['oauth_subject'] ?? '',
        ]);
        $status = $referralResult['status'] ?? null;
        $referralMeta = [
            'attributed' => !empty($referralResult['attributed']),
            'counts_as_valid' => !empty($referralResult['counts_as_valid']),
            'fraud_detected' => !empty($referralResult['fraud_detected']) || $status === 'rejected',
            'status' => $status,
            'rejection_reason' => $referralResult['rejection_reason'] ?? ($referralResult['reason'] ?? null),
            'skipped' => !empty($referralResult['skipped']),
            'edge_ok' => !empty($referralResult['ok']),
            'resolved_ref' => $refCode !== '' ? $refCode : null,
        ];
    }

    echo json_encode([
        'success' => true,
        'token' => $jwt,
        'user' => [
            'id' => $userId,
            'username' => $username,
            'email' => $email
        ],
        'is_new_user' => $isNewUser,
        'referral' => $referralMeta,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>

