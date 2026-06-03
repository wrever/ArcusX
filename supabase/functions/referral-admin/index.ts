import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requirePhpAdminJwt } from '../_shared/php-admin-jwt.ts';
import { supabaseService } from '../_shared/referral-db.ts';

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '-');
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    await requirePhpAdminJwt(req);
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? '');

    const supabase = supabaseService();

    switch (action) {
      case 'referral_stats': {
        const today = new Date().toISOString().slice(0, 10);
        const [
          { count: unread },
          { count: partners },
          { data: todayRows },
          { count: totalValidReferrals },
        ] = await Promise.all([
          supabase.from('referral_fraud_alerts').select('id', { count: 'exact', head: true })
            .eq('is_read', false),
          supabase.from('referral_partners').select('id', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase.from('referral_signups').select('status').eq('signup_date', today),
          supabase.from('referral_signups').select('id', { count: 'exact', head: true })
            .eq('status', 'valid'),
        ]);

        let validToday = 0;
        let rejectedToday = 0;
        for (const row of todayRows ?? []) {
          if (row.status === 'valid') validToday++;
          if (row.status === 'rejected') rejectedToday++;
        }

        return jsonResponse(req, {
          success: true,
          unread_fraud_alerts: unread ?? 0,
          active_partners: partners ?? 0,
          valid_signups_today: validToday,
          rejected_signups_today: rejectedToday,
          total_valid_referrals: totalValidReferrals ?? 0,
        });
      }

      case 'referral_partner_timeline': {
        const partnerId = String(body.partner_id ?? '');
        const from = String(body.from ?? '');
        const to = String(body.to ?? '');
        if (!partnerId || !from || !to) {
          return errorResponse(req, 'partner_id, from y to requeridos');
        }

        const { data: signups, error: tlErr } = await supabase
          .from('referral_signups')
          .select('signup_date')
          .eq('partner_id', partnerId)
          .eq('status', 'valid')
          .gte('signup_date', from)
          .lte('signup_date', to)
          .order('signup_date', { ascending: true });

        if (tlErr) throw tlErr;

        const daily = new Map<string, number>();
        for (const row of signups ?? []) {
          const d = String(row.signup_date ?? '');
          if (!d) continue;
          daily.set(d, (daily.get(d) ?? 0) + 1);
        }

        const dailyRows = [...daily.entries()]
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([signup_date, valid_count]) => ({ signup_date, valid_count }));

        const totalValid = (signups ?? []).length;

        return jsonResponse(req, {
          success: true,
          from,
          to,
          partner_id: partnerId,
          total_valid: totalValid,
          daily_rows: dailyRows,
        });
      }

      case 'referral_list_partners': {
        const { data, error } = await supabase
          .from('referral_partners')
          .select('*')
          .order('display_name', { ascending: true });
        if (error) throw error;
        return jsonResponse(req, { success: true, partners: data ?? [] });
      }

      case 'referral_create_partner': {
        const name = String(body.display_name ?? '').trim();
        if (!name) return errorResponse(req, 'display_name requerido');
        const ownerMysql = body.owner_mysql_user_id != null ? Number(body.owner_mysql_user_id) : null;
        const { data, error } = await supabase
          .from('referral_partners')
          .insert({
            display_name: name,
            contact_email: body.contact_email ?? null,
            notes: body.notes ?? null,
            is_active: true,
            ...(ownerMysql && ownerMysql > 0 ? { owner_mysql_user_id: ownerMysql } : {}),
          })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse(req, { success: true, partner: data });
      }

      case 'referral_create_code': {
        const partnerId = String(body.partner_id ?? '');
        const code = normalizeCode(String(body.code ?? ''));
        if (!partnerId || !code) {
          return errorResponse(req, 'partner_id y code requeridos');
        }
        if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
          return errorResponse(req, 'Código inválido');
        }
        const { data, error } = await supabase
          .from('referral_codes')
          .insert({
            partner_id: partnerId,
            code,
            label: body.label ?? null,
            is_active: true,
          })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse(req, {
          success: true,
          code: data,
          link: `https://arcusx.pro/ref/${code}`,
          link_register: `https://arcusx.pro/login?ref=${encodeURIComponent(code)}`,
        });
      }

      case 'referral_list_codes': {
        let q = supabase
          .from('referral_codes')
          .select('*, referral_partners(display_name)')
          .order('created_at', { ascending: false });
        if (body.partner_id) {
          q = q.eq('partner_id', String(body.partner_id));
        }
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse(req, { success: true, codes: data ?? [] });
      }

      case 'referral_daily_report': {
        const from = String(body.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
        const to = String(body.to ?? new Date().toISOString().slice(0, 10));
        let q = supabase
          .from('referral_daily_totals')
          .select('*, referral_partners(display_name)')
          .gte('stat_date', from)
          .lte('stat_date', to)
          .order('stat_date', { ascending: false });
        if (body.partner_id) {
          q = q.eq('partner_id', String(body.partner_id));
        }
        const { data, error } = await q;
        if (error) throw error;
        const rows = data ?? [];
        const totalValid = rows.reduce((s, r) => s + (r.valid_count ?? 0), 0);
        return jsonResponse(req, {
          success: true,
          from,
          to,
          rows,
          total_valid_signups: totalValid,
        });
      }

      case 'referral_list_signups': {
        const page = Math.max(1, Number(body.page) || 1);
        const limit = Math.min(100, Math.max(10, Number(body.limit) || 50));
        const offset = (page - 1) * limit;
        let q = supabase
          .from('referral_signups')
          .select('*')
          .order('registered_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (body.partner_id) q = q.eq('partner_id', String(body.partner_id));
        if (body.status) q = q.eq('status', String(body.status));
        if (body.signup_date) q = q.eq('signup_date', String(body.signup_date));
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse(req, {
          success: true,
          signups: data ?? [],
          page,
          limit,
        });
      }

      case 'referral_fraud_alerts': {
        const unreadOnly = body.unread_only !== '0' && body.unread_only !== false;
        let q = supabase
          .from('referral_fraud_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (unreadOnly) q = q.eq('is_read', false);
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse(req, { success: true, alerts: data ?? [] });
      }

      case 'referral_mark_alert_read': {
        const alertId = String(body.alert_id ?? '');
        if (!alertId) return errorResponse(req, 'alert_id requerido');
        const { error } = await supabase
          .from('referral_fraud_alerts')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', alertId);
        if (error) throw error;
        return jsonResponse(req, { success: true });
      }

      case 'referral_toggle_code': {
        const codeId = String(body.code_id ?? '');
        const isActive = body.is_active === true || body.is_active === 'true';
        if (!codeId) return errorResponse(req, 'code_id requerido');
        const { error } = await supabase
          .from('referral_codes')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', codeId);
        if (error) throw error;
        return jsonResponse(req, { success: true });
      }

      default:
        return errorResponse(req, `Acción no válida: ${action}`, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    const status = msg.includes('No autorizado') || msg.includes('Token') ? 403 : 500;
    return errorResponse(req, msg, status);
  }
});
