<?php
/**
 * ledger.php
 * Helpers para registrar movimientos y eventos de auditoría.
 */

function arcusx_uuid(): string {
  // UUIDv4 simple (sin dependencia)
  $data = random_bytes(16);
  $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
  $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function arcusx_record_ledger($conn, array $entry): bool {
  // entry_id requerido para idempotencia
  $eventId = $entry['event_id'] ?? arcusx_uuid();
  $type = $entry['entry_type'] ?? 'unknown';
  $amount = $entry['amount'] ?? 0;
  $asset = $entry['asset_code'] ?? 'USDC';
  $userId = $entry['user_id'] ?? null;
  $taskId = $entry['task_id'] ?? null;
  $escrowId = $entry['escrow_id'] ?? null;
  $disputeId = $entry['dispute_id'] ?? null;
  $txHash = $entry['tx_hash'] ?? null;
  $metadata = isset($entry['metadata']) ? json_encode($entry['metadata']) : null;

  $stmt = $conn->prepare("INSERT IGNORE INTO ledger_entries (event_id, entry_type, amount, asset_code, user_id, task_id, escrow_id, dispute_id, tx_hash, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  if (!$stmt) return false;

  $stmt->bind_param(
    "ssdsiiiiis",
    $eventId, $type, $amount, $asset,
    $userId, $taskId, $escrowId, $disputeId,
    $txHash, $metadata
  );
  $ok = $stmt->execute();
  $stmt->close();
  return $ok;
}

function arcusx_record_audit($conn, array $evt): bool {
  $eventType = $evt['event_type'] ?? 'unknown';
  $eventId = $evt['event_id'] ?? arcusx_uuid();
  $userId = $evt['user_id'] ?? null;
  $payload = isset($evt['payload']) ? json_encode($evt['payload']) : null;

  $stmt = $conn->prepare("INSERT IGNORE INTO audit_events (user_id, event_type, event_id, payload) VALUES (?, ?, ?, ?)");
  if (!$stmt) return false;
  $stmt->bind_param("isss", $userId, $eventType, $eventId, $payload);
  $ok = $stmt->execute();
  $stmt->close();
  return $ok;
}
