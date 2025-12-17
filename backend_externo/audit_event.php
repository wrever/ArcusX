<?php
require_once __DIR__ . '/lib/security_headers.php';
require_once __DIR__ . '/lib/require_autoload.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/ledger.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método no permitido']);
  exit;
}

$debug = getenv('ARCUSX_DEBUG') === '1';
error_reporting($debug ? E_ALL : 0);
ini_set('display_errors', $debug ? '1' : '0');
ini_set('log_errors', '1');

function getAuthUserId(string $secret): ?int {
  $headers = getallheaders();
  if (!isset($headers['Authorization'])) return null;
  if (!preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $m)) return null;
  $jwt = $m[1];
  try {
    $decoded = JWT::decode($jwt, new Key($secret, 'HS256'));
    if (isset($decoded->data->id)) return (int)$decoded->data->id;
  } catch (Exception $e) {
    return null;
  }
  return null;
}

try {
  $userId = getAuthUserId($jwt_secret); // puede ser null para eventos anónimos
  $data = json_decode(file_get_contents('php://input'), true);
  if (!is_array($data)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'JSON inválido']); exit; }

  $eventType = (string)($data['event_type'] ?? '');
  $eventId = (string)($data['event_id'] ?? '');
  $payload = $data['payload'] ?? null;

  if ($eventType === '' || $eventId === '') {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'event_type y event_id son requeridos']);
    exit;
  }

  arcusx_record_audit($conn, [
    'user_id' => $userId,
    'event_type' => $eventType,
    'event_id' => $eventId,
    'payload' => $payload
  ]);

  // Si envían expected_platform_fee, registramos ledger "platform_fee_expected"
  if (is_array($payload) && isset($payload['expected_platform_fee_amount'])) {
    $feeAmt = (float)$payload['expected_platform_fee_amount'];
    $taskId = isset($payload['task_id']) ? (int)$payload['task_id'] : null;
    $escrowId = isset($payload['escrow_id']) ? (int)$payload['escrow_id'] : null;
    $txHash = isset($payload['tx_hash']) ? (string)$payload['tx_hash'] : null;

    arcusx_record_ledger($conn, [
      'event_id' => $eventType . ':' . $eventId . ':fee_expected',
      'entry_type' => 'platform_fee_expected',
      'amount' => $feeAmt,
      'asset_code' => (string)($payload['asset_code'] ?? 'USDC'),
      'user_id' => null,
      'task_id' => $taskId,
      'escrow_id' => $escrowId,
      'tx_hash' => $txHash,
      'metadata' => $payload
    ]);
  }

  echo json_encode(['success'=>true]);
} catch (Exception $e) {
  http_response_code(500);
  $msg = $debug ? $e->getMessage() : 'Error interno del servidor';
  echo json_encode(['success'=>false,'message'=>$msg]);
}
