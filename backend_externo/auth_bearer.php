<?php
/**
 * ArcusX — JWT Bearer compartido (Semana 2)
 * Requiere: config.php (define $jwt_secret) y vendor/autoload.php (Firebase JWT).
 */

declare(strict_types=1);

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * @param array<string, mixed> $body
 */
function arcusx_json_exit(int $httpCode, array $body): void {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=UTF-8', true);
    }
    http_response_code($httpCode);
    echo json_encode($body);
    exit;
}

function arcusx_bearer_token(): ?string {
    $headers = function_exists('getallheaders') ? (getallheaders() ?: []) : [];
    $auth = $headers['Authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (is_string($auth) && preg_match('/Bearer\s+(\S+)/i', $auth, $m)) {
        return $m[1];
    }
    return null;
}

function arcusx_jwt_user_id(?string $token = null): ?int {
    global $jwt_secret;
    if (!isset($jwt_secret) || $jwt_secret === '') {
        return null;
    }
    $token = $token ?? arcusx_bearer_token();
    if ($token === null || $token === '') {
        return null;
    }
    try {
        JWT::$leeway = 300;
        $decoded = JWT::decode($token, new Key($jwt_secret, 'HS256'));
        if (isset($decoded->data->id)) {
            return (int) $decoded->data->id;
        }
    } catch (Throwable $e) {
        error_log('arcusx_jwt_user_id: ' . $e->getMessage());
    }
    return null;
}

function arcusx_require_user_id(): int {
    $id = arcusx_jwt_user_id();
    if ($id === null) {
        arcusx_json_exit(401, [
            'success' => false,
            'message' => 'Unauthorized',
            'error' => 'invalid_or_missing_token',
        ]);
    }
    return $id;
}

/**
 * @param array<string, mixed> $extra
 */
function arcusx_json_success(array $extra = [], int $httpCode = 200): void {
    arcusx_json_exit($httpCode, array_merge(['success' => true], $extra));
}

function arcusx_json_error(int $httpCode, string $message, ?string $error = null): void {
    $body = ['success' => false, 'message' => $message];
    if ($error !== null && $error !== '') {
        $body['error'] = $error;
    }
    arcusx_json_exit($httpCode, $body);
}
