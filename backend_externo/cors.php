<?php
/**
 * ArcusX — CORS único (Semana 2)
 *
 * Orígenes permitidos: lista base + opcional ARCUSX_CORS_EXTRA_ORIGINS (coma-separado).
 * Sin wildcard (*). Si el Origin del navegador no está en la lista, se usa el fallback
 * de producción solo para no omitir el header (el navegador rechazará orígenes no listados).
 *
 * Uso al inicio de cada endpoint (antes de cualquier salida y, si es posible, antes de config):
 *
 *   require_once __DIR__ . '/cors.php';
 *   arcusx_cors_handle_preflight('POST, OPTIONS');
 *   require_once __DIR__ . '/config.php'; // u otras dependencias
 *   arcusx_cors_apply('POST, OPTIONS');
 */

/**
 * @return list<string>
 */
function arcusx_cors_base_origins(): array {
    return [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://arcusx.pro',
        'https://arcusx.pro',
        'http://empresas.arcusx.pro',
        'https://empresas.arcusx.pro',
    ];
}

/**
 * @return list<string>
 */
function arcusx_cors_all_origins(): array {
    $extra = getenv('ARCUSX_CORS_EXTRA_ORIGINS');
    if ($extra === false || $extra === '') {
        return arcusx_cors_base_origins();
    }
    $parts = array_map('trim', explode(',', $extra));
    $parts = array_filter($parts, static fn($s) => $s !== '');
    return array_values(array_unique(array_merge(arcusx_cors_base_origins(), $parts)));
}

function arcusx_cors_origin_allowed(string $origin): bool {
    return $origin !== '' && in_array($origin, arcusx_cors_all_origins(), true);
}

/**
 * Valor para Access-Control-Allow-Origin en esta petición.
 */
function arcusx_cors_origin_for_request(): string {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (arcusx_cors_origin_allowed($origin)) {
        return $origin;
    }
    return 'https://arcusx.pro';
}

/**
 * @param string $methods e.g. 'GET, POST, OPTIONS'
 */
function arcusx_cors_apply(string $methods, bool $credentials = true): void {
    $allowOrigin = arcusx_cors_origin_for_request();
    header('Access-Control-Allow-Origin: ' . $allowOrigin, true);
    if ($credentials) {
        header('Access-Control-Allow-Credentials: true', true);
    }
    header('Access-Control-Allow-Methods: ' . $methods, true);
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With', true);
    header('Access-Control-Max-Age: 3600', true);
}

/**
 * Responde 200 a OPTIONS y termina (preflight).
 */
function arcusx_cors_handle_preflight(string $methods): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'OPTIONS') {
        return;
    }
    arcusx_cors_apply($methods);
    header('Content-Length: 0', true);
    header('Content-Type: text/plain; charset=UTF-8', true);
    http_response_code(200);
    exit;
}
