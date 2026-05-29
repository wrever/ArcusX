<?php
/**
 * Cliente Supabase (service role) para programa de referidos.
 */

/**
 * URL + apikey para validar JWT de usuario (auth/v1/user).
 * Acepta service_role o anon (en cPanel suele estar solo la anon).
 */
function arcusx_supabase_auth_config(): ?array
{
    $url = getenv('ARCUSX_SUPABASE_URL');
    if (!$url) {
        return null;
    }
    $key = getenv('ARCUSX_SUPABASE_SERVICE_ROLE_KEY') ?: getenv('ARCUSX_SUPABASE_ANON_KEY');
    if (!$key) {
        return null;
    }

    return [
        'url' => rtrim($url, '/'),
        'apikey' => $key,
    ];
}

function arcusx_referral_supabase_config(): ?array
{
    $url = getenv('ARCUSX_SUPABASE_URL');
    $key = getenv('ARCUSX_SUPABASE_SERVICE_ROLE_KEY');
    $secret = getenv('REFERRAL_INTERNAL_SECRET');

    if (!$url || !$key) {
        return null;
    }

    return [
        'url' => rtrim($url, '/'),
        'service_key' => $key,
        'internal_secret' => $secret ?: '',
        'functions_url' => rtrim($url, '/') . '/functions/v1',
    ];
}

function arcusx_referral_supabase_rest(
    string $method,
    string $path,
    ?array $body = null,
    array $extraHeaders = []
): array {
    $cfg = arcusx_referral_supabase_config();
    if (!$cfg) {
        return ['ok' => false, 'status' => 0, 'error' => 'Supabase no configurado'];
    }

    $url = $cfg['url'] . '/rest/v1/' . ltrim($path, '/');
    $headers = array_merge([
        'apikey: ' . $cfg['service_key'],
        'Authorization: Bearer ' . $cfg['service_key'],
        'Content-Type: application/json',
    ], $extraHeaders);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 25,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        return ['ok' => false, 'status' => 0, 'error' => $err ?: 'curl error'];
    }

    $decoded = json_decode($raw, true);
    return [
        'ok' => $status >= 200 && $status < 300,
        'status' => $status,
        'data' => $decoded,
        'raw' => $raw,
    ];
}

/**
 * Atribuye registro vía Edge Function (anti-fraude centralizado).
 */
function arcusx_referral_attribute_signup(array $payload): array
{
    $cfg = arcusx_referral_supabase_config();
    if (!$cfg || empty($cfg['internal_secret'])) {
        return ['ok' => false, 'skipped' => true, 'reason' => 'referral_not_configured'];
    }

    $url = $cfg['functions_url'] . '/referral-attribute-signup';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-referral-internal-secret: ' . $cfg['internal_secret'],
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 8,
    ]);

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false) {
        return ['ok' => false, 'error' => 'edge_unreachable'];
    }

    $data = json_decode($raw, true) ?: [];
    return array_merge(['ok' => $status >= 200 && $status < 300, 'status' => $status], $data);
}

function arcusx_referral_normalize_code(string $code): string
{
    $c = strtoupper(trim($code));
    $c = preg_replace('/\s+/', '-', $c);
    return $c ?? '';
}

function arcusx_referral_hash_with_salt(string $value): string
{
    $value = strtolower(trim($value));
    if ($value === '') {
        return '';
    }
    $salt = getenv('REFERRAL_HASH_SALT') ?: 'arcusx-referral-v1';
    return hash('sha256', $salt . ':' . $value);
}

/**
 * Rate limit endpoints públicos (tabla referral_api_hits en Supabase).
 */
function arcusx_referral_public_rate_limit(string $endpoint, int $maxPerHour = 40): bool
{
    $ip = arcusx_referral_client_ip();
    if ($ip === '') {
        return true;
    }

    $ipHash = arcusx_referral_hash_with_salt($ip);
    if ($ipHash === '') {
        return true;
    }

    $since = gmdate('c', time() - 3600);
    $path = 'referral_api_hits'
        . '?ip_hash=eq.' . rawurlencode($ipHash)
        . '&endpoint=eq.' . rawurlencode($endpoint)
        . '&created_at=gte.' . rawurlencode($since)
        . '&select=id';

    $check = arcusx_referral_supabase_rest('GET', $path);
    if (!$check['ok']) {
        return true;
    }

    $count = is_array($check['data']) ? count($check['data']) : 0;
    if ($count >= $maxPerHour) {
        return false;
    }

    arcusx_referral_supabase_rest('POST', 'referral_api_hits', [
        'ip_hash' => $ipHash,
        'endpoint' => $endpoint,
    ]);

    return true;
}

/**
 * Verifica access_token de Supabase y que coincida con supabase_user_id.
 */
function arcusx_verify_supabase_access_token(
    string $accessToken,
    string $expectedUserId,
    ?string $expectedEmail = null
): bool {
    $accessToken = trim($accessToken);
    $expectedUserId = trim($expectedUserId);
    if ($accessToken === '' || $expectedUserId === '') {
        return false;
    }

    $cfg = arcusx_supabase_auth_config();
    if (!$cfg) {
        return false;
    }

    $url = $cfg['url'] . '/auth/v1/user';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $accessToken,
            'apikey: ' . $cfg['apikey'],
        ],
        CURLOPT_TIMEOUT => 10,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false || $status !== 200) {
        return false;
    }

    $user = json_decode($raw, true);
    if (!is_array($user) || !isset($user['id']) || (string) $user['id'] !== $expectedUserId) {
        return false;
    }

    if ($expectedEmail !== null && $expectedEmail !== '') {
        $wantEmail = strtolower(trim($expectedEmail));
        $tokenEmail = strtolower(trim((string) ($user['email'] ?? '')));
        if ($tokenEmail === '' && !empty($user['user_metadata']['email'])) {
            $tokenEmail = strtolower(trim((string) $user['user_metadata']['email']));
        }
        if ($wantEmail !== '' && $tokenEmail !== '' && $tokenEmail !== $wantEmail) {
            return false;
        }
    }

    return true;
}

/**
 * Comprueba que el código de referido existe y está activo.
 */
function arcusx_referral_code_is_active(string $refCode): bool
{
    $refCode = arcusx_referral_normalize_code($refCode);
    if ($refCode === '') {
        return false;
    }

    $path = 'referral_codes'
        . '?code=eq.' . rawurlencode($refCode)
        . '&is_active=eq.true'
        . '&select=id,expires_at,referral_partners!inner(is_active)'
        . '&limit=1';

    $res = arcusx_referral_supabase_rest('GET', $path);
    if (!$res['ok'] || !is_array($res['data']) || count($res['data']) === 0) {
        return false;
    }

    $row = $res['data'][0];
    $partner = $row['referral_partners'] ?? null;
    if (is_array($partner) && isset($partner[0])) {
        $partner = $partner[0];
    }
    if (!is_array($partner) || empty($partner['is_active'])) {
        return false;
    }

    if (!empty($row['expires_at']) && strtotime((string) $row['expires_at']) < time()) {
        return false;
    }

    return true;
}

function arcusx_referral_bind_pending(string $deviceFp, string $refCode): array
{
    $deviceFp = trim($deviceFp);
    $refCode = arcusx_referral_normalize_code($refCode);
    if ($deviceFp === '' || $refCode === '') {
        return ['ok' => false, 'error' => 'device_fp y ref_code requeridos'];
    }
    if (!preg_match('/^ax-[a-z0-9]+-[a-z0-9]+$/i', $deviceFp) || strlen($deviceFp) > 80) {
        return ['ok' => false, 'error' => 'device_fp inválido'];
    }
    if (!arcusx_referral_code_is_active($refCode)) {
        return ['ok' => false, 'error' => 'Código no válido'];
    }

    $expiresAt = gmdate('c', time() + 30 * 24 * 3600);
    return arcusx_referral_supabase_rest('POST', 'referral_pending_attributions', [
        'device_fp' => $deviceFp,
        'ref_code' => $refCode,
        'expires_at' => $expiresAt,
        'claimed_at' => null,
        'supabase_user_id' => null,
    ], [
        'Prefer: resolution=merge-duplicates',
    ]);
}

/**
 * Recupera ref_code pendiente por device_fp (no reclamado y no expirado).
 */
function arcusx_referral_lookup_pending(string $deviceFp): ?string
{
    $deviceFp = trim($deviceFp);
    if ($deviceFp === '') {
        return null;
    }

    $now = gmdate('c');
    $path = 'referral_pending_attributions'
        . '?device_fp=eq.' . rawurlencode($deviceFp)
        . '&claimed_at=is.null'
        . '&expires_at=gt.' . rawurlencode($now)
        . '&select=ref_code'
        . '&limit=1';

    $res = arcusx_referral_supabase_rest('GET', $path);
    if (!$res['ok'] || !is_array($res['data']) || count($res['data']) === 0) {
        return null;
    }

    $row = $res['data'][0];
    $code = arcusx_referral_normalize_code((string) ($row['ref_code'] ?? ''));
    return $code !== '' ? $code : null;
}

function arcusx_referral_set_bind_cookie(string $refCode): void
{
    $refCode = arcusx_referral_normalize_code($refCode);
    if ($refCode === '') {
        return;
    }

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    setcookie('arcusx_ref_h', $refCode, [
        'expires' => time() + 30 * 24 * 3600,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function arcusx_referral_client_ip(): string
{
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return trim($_SERVER['HTTP_CF_CONNECTING_IP']);
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($parts[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '';
}
