import { corsHeaders } from '../../_shared/arcusx-cors.ts';
import { envelopeResponse, newRequestId } from '../../_shared/json-envelope.ts';
import { dispatch } from './router.ts';

type RestRoute = {
  method: string;
  pattern: RegExp;
  action: string;
  pathToQuery?: Record<string, string>;
  pathToBody?: Record<string, string>;
  forwardRawBody?: boolean;
};

const ROUTES: RestRoute[] = [
  { method: 'GET', pattern: /^stats\/market$/, action: 'get_landing_market_stats' },
  { method: 'GET', pattern: /^config\/platform-fee$/, action: 'get_platform_fee' },
  { method: 'GET', pattern: /^config\/api-keys\/context$/, action: 'get_api_keys_context' },
  { method: 'GET', pattern: /^config\/api-keys$/, action: 'list_user_api_keys' },
  { method: 'POST', pattern: /^config\/api-keys$/, action: 'create_user_api_key' },
  { method: 'POST', pattern: /^config\/api-keys\/revoke$/, action: 'revoke_user_api_key' },
  { method: 'GET', pattern: /^escrow\/quote$/, action: 'get_escrow_quote' },
  { method: 'GET', pattern: /^tasks$/, action: 'get_tasks' },
  { method: 'POST', pattern: /^tasks$/, action: 'create_task' },
  { method: 'GET', pattern: /^tasks\/mine$/, action: 'get_user_tasks' },
  { method: 'GET', pattern: /^tasks\/(\d+)$/, action: 'get_task_details', pathToQuery: { task_id: '$1' } },
  { method: 'POST', pattern: /^tasks\/(\d+)\/applications$/, action: 'apply_task', pathToBody: { taskId: '$1' } },
  { method: 'GET', pattern: /^tasks\/(\d+)\/proposals$/, action: 'get_task_proposals', pathToQuery: { task_id: '$1' } },
  {
    method: 'POST',
    pattern: /^tasks\/(\d+)\/proposals\/(\d+)\/select$/,
    action: 'select_proposal',
    pathToBody: { task_id: '$1', proposal_id: '$2' },
  },
  { method: 'POST', pattern: /^tasks\/(\d+)\/cancel$/, action: 'cancel_task', pathToBody: { task_id: '$1' } },
  { method: 'GET', pattern: /^private-offers$/, action: 'get_private_offers' },
  {
    method: 'POST',
    pattern: /^tasks\/(\d+)\/private\/finalize$/,
    action: 'finalize_private_offer',
    pathToBody: { task_id: '$1' },
  },
  {
    method: 'POST',
    pattern: /^tasks\/(\d+)\/private\/accept$/,
    action: 'accept_private_offer',
    pathToBody: { task_id: '$1' },
  },
  {
    method: 'POST',
    pattern: /^tasks\/(\d+)\/private\/reject$/,
    action: 'reject_private_offer',
    pathToBody: { task_id: '$1' },
  },
  { method: 'POST', pattern: /^deals$/, action: 'create_deal' },
  { method: 'GET', pattern: /^deals$/, action: 'get_my_deals' },
  { method: 'GET', pattern: /^deals\/token\/([^/]+)$/, action: 'get_deal_by_token', pathToQuery: { deal_token: '$1' } },
  { method: 'GET', pattern: /^deals\/([^/]+)$/, action: 'get_deal_details', pathToQuery: { agreement_id: '$1' } },
  { method: 'POST', pattern: /^deals\/([^/]+)\/accept$/, action: 'accept_deal' },
  { method: 'POST', pattern: /^deals\/([^/]+)\/complete$/, action: 'complete_deal', pathToBody: { agreement_id: '$1' } },
  { method: 'GET', pattern: /^tasks\/(\d+)\/escrow$/, action: 'get_escrow_status', pathToQuery: { task_id: '$1' } },
  { method: 'POST', pattern: /^tasks\/(\d+)\/escrow$/, action: 'create_escrow', pathToBody: { task_id: '$1' } },
  {
    method: 'POST',
    pattern: /^tasks\/(\d+)\/escrow\/work-started$/,
    action: 'mark_work_started',
    pathToBody: { task_id: '$1' },
  },
  {
    method: 'POST',
    pattern: /^deals\/([^/]+)\/escrow\/prepare$/,
    action: 'prepare_deal_escrow',
    pathToBody: { agreement_id: '$1' },
  },
  {
    method: 'POST',
    pattern: /^deals\/([^/]+)\/escrow\/finalize$/,
    action: 'finalize_deal_escrow',
    pathToBody: { agreement_id: '$1' },
  },
  {
    method: 'POST',
    pattern: /^tasks\/(\d+)\/escrow\/release\/confirm$/,
    action: 'complete_task',
    pathToBody: { task_id: '$1' },
  },
  {
    method: 'POST',
    pattern: /^deals\/([^/]+)\/escrow\/release\/confirm$/,
    action: 'mark_deal_released',
    pathToBody: { agreement_id: '$1' },
  },
  { method: 'GET', pattern: /^disputes$/, action: 'list_disputes' },
  { method: 'GET', pattern: /^disputes\/resolved$/, action: 'get_user_disputes' },
  { method: 'POST', pattern: /^disputes$/, action: 'create_dispute' },
  { method: 'GET', pattern: /^disputes\/(\d+)\/chat$/, action: 'get_dispute_chat', pathToQuery: { dispute_id: '$1' } },
  { method: 'GET', pattern: /^disputes\/(\d+)\/files$/, action: 'get_dispute_files', pathToQuery: { dispute_id: '$1' } },
  { method: 'GET', pattern: /^disputes\/(\d+)\/timeline$/, action: 'get_dispute_timeline', pathToQuery: { dispute_id: '$1' } },
  { method: 'GET', pattern: /^tasks\/(\d+)\/disputes\/chat$/, action: 'get_dispute_chat', pathToQuery: { task_id: '$1' } },
  { method: 'GET', pattern: /^tasks\/(\d+)\/disputes\/files$/, action: 'get_dispute_files', pathToQuery: { task_id: '$1' } },
  { method: 'GET', pattern: /^tasks\/(\d+)\/disputes\/timeline$/, action: 'get_dispute_timeline', pathToQuery: { task_id: '$1' } },
  { method: 'GET', pattern: /^deals\/([^/]+)\/disputes\/chat$/, action: 'get_dispute_chat', pathToQuery: { agreement_id: '$1' } },
  { method: 'GET', pattern: /^deals\/([^/]+)\/disputes\/files$/, action: 'get_dispute_files', pathToQuery: { agreement_id: '$1' } },
  { method: 'GET', pattern: /^deals\/([^/]+)\/disputes\/timeline$/, action: 'get_dispute_timeline', pathToQuery: { agreement_id: '$1' } },
  { method: 'GET', pattern: /^tasks\/(\d+)\/evidence$/, action: 'get_milestone_evidence', pathToQuery: { task_id: '$1' } },
  { method: 'GET', pattern: /^deals\/([^/]+)\/evidence$/, action: 'get_deal_evidence', pathToQuery: { agreement_id: '$1' } },
  { method: 'POST', pattern: /^ratings$/, action: 'create_rating' },
  { method: 'GET', pattern: /^users\/(\d+)\/ratings\/summary$/, action: 'get_user_rating_summary', pathToQuery: { user_id: '$1' } },
  { method: 'POST', pattern: /^wallets\/register$/, action: 'register_wallet' },
  { method: 'POST', pattern: /^wallets\/verify$/, action: 'verify_wallet' },
  { method: 'POST', pattern: /^tasks\/(\d+)\/escrow\/deploy\/prepare$/, action: 'prepare_escrow_deploy', pathToBody: { task_id: '$1' } },
  { method: 'POST', pattern: /^tasks\/(\d+)\/escrow\/deploy\/confirm$/, action: 'confirm_escrow_deploy', pathToBody: { task_id: '$1' } },
  { method: 'POST', pattern: /^tasks\/(\d+)\/escrow\/fund\/prepare$/, action: 'prepare_escrow_fund', pathToBody: { task_id: '$1' } },
  { method: 'POST', pattern: /^tasks\/(\d+)\/escrow\/fund\/confirm$/, action: 'confirm_escrow_fund', pathToBody: { task_id: '$1' } },
  { method: 'POST', pattern: /^tasks\/(\d+)\/escrow\/release\/prepare$/, action: 'prepare_escrow_release', pathToBody: { task_id: '$1' } },
  { method: 'POST', pattern: /^tasks\/(\d+)\/escrow\/release\/confirm$/, action: 'confirm_escrow_release', pathToBody: { task_id: '$1' } },
  // Partner escrow (API key + wallets + amount — no JWT / no task)
  { method: 'POST', pattern: /^partner\/escrows\/deploy\/prepare$/, action: 'partner_escrow_deploy_prepare' },
  { method: 'POST', pattern: /^partner\/escrows\/([^/]+)\/deploy\/confirm$/, action: 'partner_escrow_deploy_confirm', pathToBody: { escrow_id: '$1' } },
  { method: 'POST', pattern: /^partner\/escrows\/([^/]+)\/fund\/prepare$/, action: 'partner_escrow_fund_prepare', pathToBody: { escrow_id: '$1' } },
  { method: 'POST', pattern: /^partner\/escrows\/([^/]+)\/fund\/confirm$/, action: 'partner_escrow_fund_confirm', pathToBody: { escrow_id: '$1' } },
  { method: 'POST', pattern: /^partner\/escrows\/([^/]+)\/complete\/prepare$/, action: 'partner_escrow_complete_prepare', pathToBody: { escrow_id: '$1' } },
  { method: 'POST', pattern: /^partner\/escrows\/([^/]+)\/complete\/confirm$/, action: 'partner_escrow_complete_confirm', pathToBody: { escrow_id: '$1' } },
  { method: 'POST', pattern: /^partner\/escrows\/([^/]+)\/release\/prepare$/, action: 'partner_escrow_release_prepare', pathToBody: { escrow_id: '$1' } },
  { method: 'POST', pattern: /^partner\/escrows\/([^/]+)\/release\/confirm$/, action: 'partner_escrow_release_confirm', pathToBody: { escrow_id: '$1' } },
  { method: 'GET', pattern: /^partner\/escrows$/, action: 'partner_escrow_list' },
  { method: 'GET', pattern: /^partner\/escrows\/([^/]+)$/, action: 'partner_escrow_get', pathToQuery: { escrow_id: '$1' } },
  // Partner deals (payment links — API key; getByToken público)
  { method: 'POST', pattern: /^partner\/deals$/, action: 'partner_deal_create' },
  { method: 'GET', pattern: /^partner\/deals$/, action: 'partner_deal_list' },
  { method: 'GET', pattern: /^partner\/deals\/token\/([^/]+)$/, action: 'partner_deal_get_by_token', pathToQuery: { deal_token: '$1' } },
  { method: 'GET', pattern: /^partner\/deals\/([^/]+)$/, action: 'partner_deal_get', pathToQuery: { deal_id: '$1' } },
  { method: 'POST', pattern: /^partner\/deals\/([^/]+)\/fund\/prepare$/, action: 'partner_deal_fund_prepare', pathToBody: { deal_id: '$1' } },
  { method: 'POST', pattern: /^partner\/deals\/([^/]+)\/fund\/confirm$/, action: 'partner_deal_fund_confirm', pathToBody: { deal_id: '$1' } },
  { method: 'POST', pattern: /^partner\/deals\/([^/]+)\/release\/prepare$/, action: 'partner_deal_release_prepare', pathToBody: { deal_id: '$1' } },
  { method: 'POST', pattern: /^partner\/deals\/([^/]+)\/release\/confirm$/, action: 'partner_deal_release_confirm', pathToBody: { deal_id: '$1' } },
  { method: 'GET', pattern: /^webhooks\/deliveries$/, action: 'list_webhook_deliveries' },
  { method: 'POST', pattern: /^tasks\/(\d+)\/evidence$/, action: 'upload_milestone_evidence', pathToBody: { task_id: '$1' }, forwardRawBody: true },
  { method: 'POST', pattern: /^deals\/([^/]+)\/evidence$/, action: 'upload_deal_evidence', pathToBody: { agreement_id: '$1' }, forwardRawBody: true },
  { method: 'POST', pattern: /^jobs$/, action: 'create_job' },
  { method: 'GET', pattern: /^jobs$/, action: 'list_jobs' },
  { method: 'GET', pattern: /^jobs\/([^/]+)$/, action: 'get_job', pathToQuery: { job_id: '$1' } },
  { method: 'POST', pattern: /^jobs\/([^/]+)\/cancel$/, action: 'cancel_job', pathToBody: { job_id: '$1' } },
  { method: 'POST', pattern: /^jobs\/([^/]+)\/subjobs$/, action: 'create_subjob', pathToBody: { job_id: '$1' } },
  { method: 'GET', pattern: /^subjobs\/mine$/, action: 'list_subjobs_mine' },
  { method: 'GET', pattern: /^subjobs\/([^/]+)$/, action: 'get_subjob', pathToQuery: { subjob_id: '$1' } },
  { method: 'GET', pattern: /^subjobs\/([^/]+)\/escrow\/quote$/, action: 'subjob_escrow_quote', pathToQuery: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/escrow\/deploy\/prepare$/, action: 'subjob_escrow_deploy_prepare', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/escrow\/deploy\/confirm$/, action: 'subjob_escrow_deploy_confirm', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/escrow\/fund\/prepare$/, action: 'subjob_escrow_fund_prepare', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/escrow\/fund\/confirm$/, action: 'subjob_escrow_fund_confirm', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/escrow\/release\/prepare$/, action: 'subjob_escrow_release_prepare', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/escrow\/release\/confirm$/, action: 'subjob_escrow_release_confirm', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/attest$/, action: 'attest_subjob', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/work-started$/, action: 'subjob_mark_work_started', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/cancel$/, action: 'cancel_subjob', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/link-proposal$/, action: 'link_subjob_proposal', pathToBody: { subjob_id: '$1' } },
  { method: 'POST', pattern: /^subjobs\/([^/]+)\/release-on-callback$/, action: 'release_subjob_on_callback', pathToBody: { subjob_id: '$1' } },
];

function v1Subpath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const apiIdx = parts.indexOf('arcusx-api');
  if (apiIdx === -1 || parts[apiIdx + 1] !== 'v1') return null;
  return parts.slice(apiIdx + 2).join('/');
}

function applyCaptures(
  map: Record<string, string> | undefined,
  captures: string[],
): Record<string, string> {
  if (!map) return {};
  const out: Record<string, string> = {};
  for (const [key, template] of Object.entries(map)) {
    const m = template.match(/^\$(\d+)$/);
    out[key] = m ? (captures[Number(m[1]) - 1] ?? '') : template;
  }
  return out;
}

function matchRoute(method: string, subpath: string): {
  action: string;
  captures: string[];
  route: RestRoute;
} | null {
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const m = subpath.match(route.pattern);
    if (!m) continue;
    return { action: route.action, captures: m.slice(1), route };
  }
  return null;
}

export async function tryDispatchRestV1(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const subpath = v1Subpath(url.pathname);
  if (subpath == null) return null;

  const matched = matchRoute(req.method, subpath);
  if (!matched) {
    const requestId = newRequestId();
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'not_found', message: `REST route not found: ${req.method} /v1/${subpath}` },
      meta: { request_id: requestId, api_version: 'v1' },
    }), {
      status: 404,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  const { action, captures, route } = matched;
  const proxyUrl = new URL(url.toString());
  proxyUrl.searchParams.set('action', action);

  for (const [k, v] of Object.entries(applyCaptures(route.pathToQuery, captures))) {
    proxyUrl.searchParams.set(k, v);
  }

  let bodyText: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (route.forwardRawBody) {
      bodyText = await req.clone().text();
    } else {
      let body: Record<string, unknown> = {};
      try {
        body = await req.clone().json() as Record<string, unknown>;
      } catch {
        body = {};
      }
      body = { ...body, ...applyCaptures(route.pathToBody, captures) };
      bodyText = JSON.stringify(body);
    }
  }

  const proxyReq = new Request(proxyUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: bodyText,
  });

  const requestId = newRequestId();
  const response = await dispatch(proxyReq);
  return envelopeResponse(req, response, requestId);
}
