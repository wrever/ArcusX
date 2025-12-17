<?php
/**
 * security_headers.php
 * Cabeceras de seguridad y CORS configurable para ArcusX.
 * - No imprime salida.
 * - Debe incluirse ANTES de cualquier output.
 */

if (!headers_sent()) {
  // --- Security headers (safe defaults) ---
  header('X-Content-Type-Options: nosniff');
  header('X-Frame-Options: DENY');
  header('Referrer-Policy: strict-origin-when-cross-origin');
  header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
  header('Cross-Origin-Opener-Policy: same-origin');
  header('Cross-Origin-Resource-Policy: same-site');

  // CSP: ajusta si usas inline scripts/styles. Por ahora, minimizamos riesgo sin romper.
  // Nota: Si tu frontend necesita 'unsafe-inline', cámbialo en env ARCUSX_CSP.
  $csp = getenv('ARCUSX_CSP');
  if (!$csp) {
    $csp = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
  }
  header('Content-Security-Policy: ' . $csp);

  // HSTS solo en HTTPS
  $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
  if ($isHttps) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
  }

  // --- CORS (configurable) ---
  // Define ARCUSX_ALLOWED_ORIGINS como lista separada por comas: https://tudominio.cl,http://localhost:5173
  $allowed = getenv('ARCUSX_ALLOWED_ORIGINS');
  $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
  if ($allowed && $origin) {
    $allowedList = array_map('trim', explode(',', $allowed));
    if (in_array($origin, $allowedList, true)) {
      header('Access-Control-Allow-Origin: ' . $origin);
      header('Vary: Origin');
      header('Access-Control-Allow-Credentials: true');
      header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
      header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }
  } else {
    // Compatibilidad: si no configuras CORS, mantenemos el comportamiento previo
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
  }
}
