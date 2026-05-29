<?php
require_once __DIR__ . '/cors.php';
arcusx_cors_handle_preflight('POST, OPTIONS');

ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth_bearer.php';

arcusx_cors_apply('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    arcusx_json_exit(405, [
        'success' => false,
        'message' => 'Method not allowed',
        'error' => 'method_not_allowed',
    ]);
}

$applicantId = arcusx_require_user_id();

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    arcusx_json_exit(400, [
        'success' => false,
        'message' => 'Invalid JSON body',
        'error' => 'invalid_json',
    ]);
}

$missing_fields = [];
if (!isset($data['taskId'])) {
    $missing_fields[] = 'taskId';
}
if (!isset($data['message'])) {
    $missing_fields[] = 'message';
}
if (!isset($data['walletAddress'])) {
    $missing_fields[] = 'walletAddress';
}

if ($missing_fields !== []) {
    error_log('apply_task missing: ' . implode(', ', $missing_fields));
    arcusx_json_exit(400, [
        'success' => false,
        'message' => 'Missing required fields: ' . implode(', ', $missing_fields),
        'error' => 'missing_fields',
    ]);
}

$taskId = (int) $data['taskId'];
$bodyApplicantId = isset($data['applicantId']) ? (int) $data['applicantId'] : 0;

if ($bodyApplicantId > 0 && $bodyApplicantId !== $applicantId) {
    arcusx_json_exit(403, [
        'success' => false,
        'message' => 'Forbidden: applicantId does not match authenticated user',
        'error' => 'applicant_id_mismatch',
    ]);
}

$message = trim((string) $data['message']);
if ($message === '') {
    arcusx_json_exit(400, [
        'success' => false,
        'message' => 'Message is required',
        'error' => 'message_required',
    ]);
}

$walletAddress_raw = trim((string) $data['walletAddress']);

if ($walletAddress_raw === '') {
    arcusx_json_exit(400, [
        'success' => false,
        'message' => 'Wallet address cannot be empty',
        'error' => 'wallet_required',
    ]);
}

$address_length = strlen($walletAddress_raw);
if ($address_length !== 56) {
    arcusx_json_exit(400, [
        'success' => false,
        'message' => 'Stellar address must be exactly 56 characters',
        'error' => 'wallet_invalid_length',
    ]);
}

if (substr($walletAddress_raw, 0, 1) !== 'G') {
    arcusx_json_exit(400, [
        'success' => false,
        'message' => 'Stellar address must start with G',
        'error' => 'wallet_invalid_format',
    ]);
}

if (!preg_match('/^G[A-Z0-9]{55}$/i', $walletAddress_raw)) {
    $uppercase_address = strtoupper($walletAddress_raw);
    if (preg_match('/^G[A-Z0-9]{55}$/', $uppercase_address)) {
        $walletAddress_raw = $uppercase_address;
    } else {
        arcusx_json_exit(400, [
            'success' => false,
            'message' => 'Stellar address contains invalid characters',
            'error' => 'wallet_invalid_chars',
        ]);
    }
}

$walletAddress = $walletAddress_raw;
$portfolioUrl = '';
if (isset($data['portfolioUrl']) && trim((string) $data['portfolioUrl']) !== '') {
    $portfolioUrl = trim((string) $data['portfolioUrl']);
}

$stmt_task = $conn->prepare('SELECT id, user_id FROM tasks WHERE id = ? LIMIT 1');
if ($stmt_task === false) {
    arcusx_json_exit(500, ['success' => false, 'message' => 'Server error', 'error' => 'db_prepare']);
}
$stmt_task->bind_param('i', $taskId);
$stmt_task->execute();
$task_result = $stmt_task->get_result();
if ($task_result->num_rows === 0) {
    $stmt_task->close();
    arcusx_json_exit(404, [
        'success' => false,
        'message' => 'Task not found',
        'error' => 'task_not_found',
    ]);
}
$task_data = $task_result->fetch_assoc();
$stmt_task->close();

$privCol = $conn->query("SHOW COLUMNS FROM tasks LIKE 'is_private_invite'");
if ($privCol && $privCol->num_rows > 0) {
    $stmt_priv = $conn->prepare(
        'SELECT COALESCE(is_private_invite, 0) AS pi, invited_user_id FROM tasks WHERE id = ? LIMIT 1'
    );
    if ($stmt_priv) {
        $stmt_priv->bind_param('i', $taskId);
        $stmt_priv->execute();
        $priv_result = $stmt_priv->get_result();
        if ($priv_result && $priv_result->num_rows > 0) {
            $pr = $priv_result->fetch_assoc();
            if ((int) ($pr['pi'] ?? 0) === 1 && (int) ($pr['invited_user_id'] ?? 0) > 0) {
                if ((int) $pr['invited_user_id'] !== $applicantId) {
                    $stmt_priv->close();
                    arcusx_json_exit(403, [
                        'success' => false,
                        'message' => 'This private offer is only for the invited freelancer',
                        'error' => 'private_invite_only',
                    ]);
                }
            }
        }
        $stmt_priv->close();
    }
}

if ((int) $task_data['user_id'] === $applicantId) {
    arcusx_json_exit(400, [
        'success' => false,
        'message' => 'You cannot apply to your own task',
        'error' => 'own_task',
    ]);
}

$stmt_dup = $conn->prepare('SELECT id FROM applications WHERE task_id = ? AND applicant_id = ? LIMIT 1');
if ($stmt_dup === false) {
    arcusx_json_exit(500, ['success' => false, 'message' => 'Server error', 'error' => 'db_prepare']);
}
$stmt_dup->bind_param('ii', $taskId, $applicantId);
$stmt_dup->execute();
$dup_result = $stmt_dup->get_result();
if ($dup_result->num_rows > 0) {
    $stmt_dup->close();
    arcusx_json_exit(409, [
        'success' => false,
        'message' => 'You have already applied to this task',
        'error' => 'already_applied',
    ]);
}
$stmt_dup->close();

$stmt = $conn->prepare(
    'INSERT INTO applications (task_id, applicant_id, message, portfolio_url, worker_wallet_address) VALUES (?, ?, ?, ?, ?)'
);
if ($stmt === false) {
    arcusx_json_exit(500, ['success' => false, 'message' => 'Server error', 'error' => 'db_prepare']);
}

$stmt->bind_param('iisss', $taskId, $applicantId, $message, $portfolioUrl, $walletAddress);

if ($stmt->execute()) {
    arcusx_json_exit(201, [
        'success' => true,
        'message' => 'Application submitted successfully',
        'application_id' => (int) $conn->insert_id,
    ]);
}

error_log('apply_task insert: ' . $stmt->error);
$stmt->close();
arcusx_json_exit(500, [
    'success' => false,
    'message' => 'Error submitting application',
    'error' => 'insert_failed',
]);
