<?php
/**
 * Handlers admin — programa de referidos (Supabase).
 */

require_once __DIR__ . '/referral_supabase.php';

function referral_admin_require_supabase(): void
{
    if (!arcusx_referral_supabase_config()) {
        sendErrorResponse('Supabase no configurado (ARCUSX_SUPABASE_URL / SERVICE_ROLE_KEY)', 503);
    }
}

function handleReferralStats(): array
{
    referral_admin_require_supabase();

    $alerts = arcusx_referral_supabase_rest(
        'GET',
        'referral_fraud_alerts?select=id&is_read=eq.false',
    );

    $partners = arcusx_referral_supabase_rest(
        'GET',
        'referral_partners?select=id&is_active=eq.true',
    );

    $today = gmdate('Y-m-d');
    $todaySignups = arcusx_referral_supabase_rest(
        'GET',
        'referral_signups?select=id,status&signup_date=eq.' . $today,
    );

    $validToday = 0;
    $rejectedToday = 0;
    if ($todaySignups['ok'] && is_array($todaySignups['data'])) {
        foreach ($todaySignups['data'] as $row) {
            if (($row['status'] ?? '') === 'valid') {
                $validToday++;
            } elseif (($row['status'] ?? '') === 'rejected') {
                $rejectedToday++;
            }
        }
    }

    return [
        'success' => true,
        'unread_fraud_alerts' => is_array($alerts['data']) ? count($alerts['data']) : 0,
        'active_partners' => is_array($partners['data']) ? count($partners['data']) : 0,
        'valid_signups_today' => $validToday,
        'rejected_signups_today' => $rejectedToday,
    ];
}

function handleReferralListPartners(array $params): array
{
    referral_admin_require_supabase();
    $res = arcusx_referral_supabase_rest(
        'GET',
        'referral_partners?select=*&order=display_name.asc',
    );
    if (!$res['ok']) {
        sendErrorResponse('Error al listar afiliados', 500, $res['raw'] ?? null);
    }
    return ['success' => true, 'partners' => $res['data'] ?? []];
}

function handleReferralCreatePartner(array $data): array
{
    referral_admin_require_supabase();
    $name = trim($data['display_name'] ?? '');
    if ($name === '') {
        sendErrorResponse('display_name requerido', 400);
    }

    $res = arcusx_referral_supabase_rest(
        'POST',
        'referral_partners',
        [
            'display_name' => $name,
            'contact_email' => $data['contact_email'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_active' => true,
        ],
        ['Prefer: return=representation'],
    );

    if (!$res['ok']) {
        sendErrorResponse('No se pudo crear afiliado', 500, $res['raw'] ?? null);
    }

    $row = is_array($res['data']) ? ($res['data'][0] ?? $res['data']) : null;
    return ['success' => true, 'partner' => $row];
}

function handleReferralCreateCode(array $data): array
{
    referral_admin_require_supabase();
    $partnerId = $data['partner_id'] ?? '';
    $code = arcusx_referral_normalize_code($data['code'] ?? '');
    if (!$partnerId || $code === '') {
        sendErrorResponse('partner_id y code requeridos', 400);
    }
    if (!preg_match('/^[A-Z0-9][A-Z0-9_-]{2,31}$/', $code)) {
        sendErrorResponse('Código inválido (3-32 chars, A-Z0-9_-)', 400);
    }

    $res = arcusx_referral_supabase_rest(
        'POST',
        'referral_codes',
        [
            'partner_id' => $partnerId,
            'code' => $code,
            'label' => $data['label'] ?? null,
            'is_active' => true,
        ],
        ['Prefer: return=representation'],
    );

    if (!$res['ok']) {
        sendErrorResponse('No se pudo crear código', 500, $res['raw'] ?? null);
    }

    $row = is_array($res['data']) ? ($res['data'][0] ?? $res['data']) : null;
    $link = 'https://arcusx.pro/ref/' . $code;
    return ['success' => true, 'code' => $row, 'link' => $link];
}

function handleReferralListCodes(array $params): array
{
    referral_admin_require_supabase();
    $partnerId = $params['partner_id'] ?? '';
    $path = 'referral_codes?select=*,referral_partners(display_name)&order=created_at.desc';
    if ($partnerId !== '') {
        $path .= '&partner_id=eq.' . urlencode($partnerId);
    }

    $res = arcusx_referral_supabase_rest('GET', $path);
    if (!$res['ok']) {
        sendErrorResponse('Error al listar códigos', 500);
    }
    return ['success' => true, 'codes' => $res['data'] ?? []];
}

function handleReferralDailyReport(array $params): array
{
    referral_admin_require_supabase();
    $from = $params['from'] ?? gmdate('Y-m-d', strtotime('-30 days'));
    $to = $params['to'] ?? gmdate('Y-m-d');
    $partnerId = $params['partner_id'] ?? '';

    $path = 'referral_daily_totals?select=*,referral_partners(display_name)'
        . '&stat_date=gte.' . $from
        . '&stat_date=lte.' . $to
        . '&order=stat_date.desc';

    if ($partnerId !== '') {
        $path .= '&partner_id=eq.' . urlencode($partnerId);
    }

    $res = arcusx_referral_supabase_rest('GET', $path);
    if (!$res['ok']) {
        sendErrorResponse('Error en reporte diario', 500);
    }

    $rows = $res['data'] ?? [];
    $totalValid = 0;
    foreach ($rows as $r) {
        $totalValid += (int) ($r['valid_count'] ?? 0);
    }

    return [
        'success' => true,
        'from' => $from,
        'to' => $to,
        'rows' => $rows,
        'total_valid_signups' => $totalValid,
        'estimated_usdc' => round($totalValid * 0.5, 2),
    ];
}

function handleReferralListSignups(array $params): array
{
    referral_admin_require_supabase();
    $page = max(1, (int) ($params['page'] ?? 1));
    $limit = min(100, max(10, (int) ($params['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;

    $filters = ['order=registered_at.desc', 'limit=' . $limit, 'offset=' . $offset];
    if (!empty($params['partner_id'])) {
        $filters[] = 'partner_id=eq.' . urlencode($params['partner_id']);
    }
    if (!empty($params['status'])) {
        $filters[] = 'status=eq.' . urlencode($params['status']);
    }
    if (!empty($params['signup_date'])) {
        $filters[] = 'signup_date=eq.' . urlencode($params['signup_date']);
    }

    $path = 'referral_signups?select=*&' . implode('&', $filters);
    $res = arcusx_referral_supabase_rest('GET', $path);
    if (!$res['ok']) {
        sendErrorResponse('Error al listar registros', 500);
    }

    return [
        'success' => true,
        'signups' => $res['data'] ?? [],
        'page' => $page,
        'limit' => $limit,
    ];
}

function handleReferralFraudAlerts(array $params): array
{
    referral_admin_require_supabase();
    $unreadOnly = ($params['unread_only'] ?? '1') === '1';
    $path = 'referral_fraud_alerts?select=*&order=created_at.desc&limit=100';
    if ($unreadOnly) {
        $path .= '&is_read=eq.false';
    }

    $res = arcusx_referral_supabase_rest('GET', $path);
    if (!$res['ok']) {
        sendErrorResponse('Error al cargar alertas', 500);
    }

    return ['success' => true, 'alerts' => $res['data'] ?? []];
}

function handleReferralMarkAlertRead(array $data): array
{
    referral_admin_require_supabase();
    $id = $data['alert_id'] ?? '';
    if ($id === '') {
        sendErrorResponse('alert_id requerido', 400);
    }

    $res = arcusx_referral_supabase_rest(
        'PATCH',
        'referral_fraud_alerts?id=eq.' . urlencode($id),
        ['is_read' => true, 'read_at' => gmdate('c')],
    );

    if (!$res['ok']) {
        sendErrorResponse('No se pudo marcar alerta', 500);
    }

    return ['success' => true];
}

function handleReferralToggleCode(array $data): array
{
    referral_admin_require_supabase();
    $id = $data['code_id'] ?? '';
    $active = !empty($data['is_active']);
    if ($id === '') {
        sendErrorResponse('code_id requerido', 400);
    }

    $res = arcusx_referral_supabase_rest(
        'PATCH',
        'referral_codes?id=eq.' . urlencode($id),
        ['is_active' => $active, 'updated_at' => gmdate('c')],
    );

    if (!$res['ok']) {
        sendErrorResponse('Error al actualizar código', 500);
    }

    return ['success' => true];
}
