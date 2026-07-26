<?php
/**
 * Proxy mínimo para api.arcusx.pro (cPanel / Apache + PHP).
 * Reenvía a arcusx-partner-api en Supabase — sin anon key en el cliente.
 *
 * Config opcional (fuera de public_html): ARCUSX_PARTNER_UPSTREAM en .env del servidor
 * Default: …/functions/v1/arcusx-partner-api
 */
declare(strict_types=1);

const DEFAULT_UPSTREAM = 'https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-partner-api';

function upstreamBase(): string
{
    $env = getenv('ARCUSX_PARTNER_UPSTREAM');
    if (is_string($env) && $env !== '') {
        return rtrim($env, '/');
    }
    return DEFAULT_UPSTREAM;
}

function getRequestHeaders(): array
{
    $out = [];
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strtolower($name) === 'host') {
                continue;
            }
            $out[] = $name . ': ' . $value;
        }
        return $out;
    }
    foreach ($_SERVER as $key => $value) {
        if (!str_starts_with($key, 'HTTP_')) {
            continue;
        }
        if ($key === 'HTTP_HOST') {
            continue;
        }
        $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
        $out[] = $name . ': ' . $value;
    }
    return $out;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH) ?: '/';
$query = parse_url($uri, PHP_URL_QUERY);
$target = upstreamBase() . $path . ($query ? '?' . $query : '');

$body = null;
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $body = file_get_contents('php://input');
}

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => getRequestHeaders(),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_POSTFIELDS => $body !== '' ? $body : null,
]);

$raw = curl_exec($ch);
if ($raw === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => ['code' => 'bad_gateway', 'message' => 'Upstream unreachable'],
    ]);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($raw, 0, $headerSize);
$responseBody = substr($raw, $headerSize);

http_response_code($status);

$skipHeaders = ['transfer-encoding', 'connection', 'content-encoding', 'keep-alive'];
foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || !str_contains($line, ':')) {
        continue;
    }
    [$name, $value] = explode(':', $line, 2);
    $lower = strtolower(trim($name));
    if (in_array($lower, $skipHeaders, true)) {
        continue;
    }
    header(trim($name) . ': ' . trim($value), $lower !== 'content-type');
}

echo $responseBody;
