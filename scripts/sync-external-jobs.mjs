/**
 * Sync external Web3 jobs → arcusx_external_jobs
 *
 * Public APIs (no HTML scrape — Cloudflare blocks cryptojobslist / wwshemi / laborx):
 *   Jobicy:      crypto, blockchain
 *   RemoteOK:    web3, blockchain, crypto, defi
 *   web3.career: WEB3_CAREER_API_TOKEN (server-only; never expose to browser)
 *
 * Docs: https://docs.bondex.app/api-reference
 * Terms: use apply_url as-is with follow link (no nofollow); do not alter query params.
 *
 * Usage:
 *   set -a && source arcusx/.env && set +a
 *   node scripts/sync-external-jobs.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, '../arcusx/package.json'));
const { createClient } = require('@supabase/supabase-js');

const USER_AGENT = 'ArcusXJobBot/1.0 (+https://arcusx.pro; jobs aggregator)';
const url =
  process.env.ARCUSX_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const key =
  process.env.ARCUSX_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEB3_CAREER_TOKEN = String(process.env.WEB3_CAREER_API_TOKEN || '').trim();

if (!url || !key) {
  console.error('Missing ARCUSX_SUPABASE_URL / ARCUSX_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s, n = 280) {
  const t = String(s || '').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

/** Drop generic remote jobs that slipped into crypto/web3 API tags. */
const WEB3_RE =
  /\b(crypto|blockchain|web3|defi|nft|dao|solidity|ethereum|bitcoin|btc|eth|solana|stellar|soroban|token|on-?chain|smart\s*contract|wallet|dex|cex|stablecoin|layer\s*2|\bl2\b|zk|zero.?knowledge|protocol|metamask|binance|coinbase|okx|kraken|uniswap|aave|polygon|avalanche|cosmos|near|sui|aptos|ripple|xrp|tron|base\b|op\b|optimism|arbitrum)\b/i;

function isWeb3Relevant(job) {
  // web3.career is already curated — always keep
  if (job.source === 'web3career') return true;
  const blob = `${job.title || ''} ${job.company || ''} ${(job.tags || []).join(' ')} ${job.excerpt || ''}`;
  return WEB3_RE.test(blob);
}

function formatSalaryUsd(min, max) {
  const a = Number(min);
  const b = Number(max);
  if (Number.isFinite(a) && a > 0 && Number.isFinite(b) && b > 0) {
    return `$${Math.round(a / 1000)}k–$${Math.round(b / 1000)}k`;
  }
  if (Number.isFinite(a) && a > 0) return `$${Math.round(a / 1000)}k+`;
  return null;
}

/** Normalize any date-ish value to ISO string (or null) for timestamptz. */
function normalizePostedAt(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const s = String(value).trim();
  if (/^\d{9,13}$/.test(s)) {
    const n = Number(s);
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function parseTitleCompany(titleRaw, companyRaw) {
  let title = String(titleRaw || '').trim();
  let company = companyRaw ? String(companyRaw).trim() : null;
  if (!company) {
    const m = title.match(/^(.+?)\s+at\s+(.+)$/i);
    if (m) {
      title = m[1].trim();
      company = m[2].trim();
    }
  }
  return { title, company };
}

async function fetchJson(endpoint) {
  const res = await fetch(endpoint, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`${endpoint.split('?')[0]} → HTTP ${res.status}`);
  return res.json();
}

async function fetchJobicy(tag) {
  const data = await fetchJson(
    `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`,
  );
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  return jobs
    .map((j) => {
      const id = String(j.id ?? '');
      const title = String(j.jobTitle ?? '').trim();
      const apply = String(j.url ?? '').trim();
      if (!id || !title || !apply) return null;
      const industry = Array.isArray(j.jobIndustry)
        ? j.jobIndustry.map((x) => stripHtml(String(x)))
        : [];
      const types = Array.isArray(j.jobType) ? j.jobType.map(String) : [];
      return {
        source: 'jobicy',
        source_job_id: id,
        title,
        company: j.companyName ? String(j.companyName) : null,
        location: j.jobGeo ? String(j.jobGeo) : 'Remote',
        salary_text: null,
        tags: [...types, ...industry, tag, 'web3'].filter(Boolean).slice(0, 12),
        apply_url: apply,
        company_logo: j.companyLogo ? String(j.companyLogo) : null,
        excerpt: j.jobExcerpt ? truncate(stripHtml(String(j.jobExcerpt))) : null,
        posted_at: j.pubDate ? String(j.pubDate) : null,
        raw: { id: j.id, tag },
      };
    })
    .filter(Boolean);
}

async function fetchRemoteOk(tag) {
  const data = await fetchJson(
    `https://remoteok.com/api?tags=${encodeURIComponent(tag)}`,
  );
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const j of data) {
    if (!j?.id || !j?.position) continue;
    const apply = String(j.apply_url || j.url || '').trim();
    const title = String(j.position).trim();
    if (!apply || !title) continue;
    const tags = Array.isArray(j.tags) ? j.tags.map(String).slice(0, 12) : [tag];
    let salary_text = null;
    const min = Number(j.salary_min);
    const max = Number(j.salary_max);
    if (Number.isFinite(min) && min > 0 && Number.isFinite(max) && max > 0) {
      salary_text = `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k`;
    }
    out.push({
      source: 'remoteok',
      source_job_id: String(j.id),
      title,
      company: j.company ? String(j.company) : null,
      location: j.location ? String(j.location) : 'Remote',
      salary_text,
      tags: tags.length ? tags : [tag],
      apply_url: apply,
      company_logo: j.company_logo || j.logo || null,
      excerpt: j.description ? truncate(stripHtml(String(j.description))) : null,
      posted_at: j.date ? String(j.date) : null,
      raw: { id: j.id, slug: j.slug, tag },
    });
  }
  return out;
}

/** Extract jobs array from web3.career mixed-type root response. */
function extractWeb3CareerJobs(data) {
  if (!Array.isArray(data)) return [];
  const nested = data.find((item) => Array.isArray(item));
  if (nested) return nested.filter((j) => j && typeof j === 'object' && j.apply_url);
  if (data.length && typeof data[0] === 'object' && data[0]?.apply_url) {
    return data.filter((j) => j && typeof j === 'object' && j.apply_url);
  }
  return [];
}

async function fetchWeb3Career(params = {}) {
  if (!WEB3_CAREER_TOKEN) return [];
  const qs = new URLSearchParams({
    token: WEB3_CAREER_TOKEN,
    limit: String(params.limit ?? 100),
    show_description: 'true',
  });
  if (params.remote) qs.set('remote', 'true');
  if (params.tag) qs.set('tag', params.tag);
  // Never log the full URL (contains token)
  const res = await fetch(`https://web3.career/api/v1?${qs}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`web3.career → HTTP ${res.status}`);
  const data = await res.json();
  const jobs = extractWeb3CareerJobs(data);
  return jobs
    .map((j) => {
      const apply = String(j.apply_url || '').trim();
      if (!apply) return null;
      const { title, company } = parseTitleCompany(j.title, j.company);
      if (!title) return null;
      const id =
        j.id != null
          ? String(j.id)
          : createHash('sha1').update(apply).digest('hex').slice(0, 16);
      const tags = Array.isArray(j.tags) ? j.tags.map(String).slice(0, 12) : [];
      const salary_text =
        formatSalaryUsd(j.salary_min_value, j.salary_max_value) ||
        formatSalaryUsd(j.estimated_min_salary, j.estimated_max_salary);
      let location = j.location ? String(j.location).trim() : null;
      if (j.is_remote === true || (!location && params.remote)) {
        location = location ? `Remote · ${location}` : 'Remote';
      }
      let posted_at = null;
      if (j.date_epoch) posted_at = new Date(Number(j.date_epoch) * 1000).toISOString();
      else if (j.date) {
        const t = Date.parse(String(j.date));
        posted_at = Number.isFinite(t) ? new Date(t).toISOString() : String(j.date);
      }
      return {
        source: 'web3career',
        source_job_id: id,
        title,
        company,
        location,
        salary_text,
        tags: tags.length ? tags : ['web3'],
        apply_url: apply, // do not modify — terms of use
        company_logo: null,
        excerpt: j.description ? truncate(stripHtml(String(j.description))) : null,
        posted_at,
        raw: { id: j.id, country: j.country, is_remote: j.is_remote },
      };
    })
    .filter(Boolean);
}

async function fetchRemotive(search) {
  const data = await fetchJson(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search)}&limit=40`,
  );
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  return jobs
    .map((j) => {
      const id = String(j.id ?? '');
      const title = String(j.title ?? '').trim();
      const apply = String(j.url ?? '').trim();
      if (!id || !title || !apply) return null;
      const tags = Array.isArray(j.tags) ? j.tags.map(String).slice(0, 10) : [];
      if (j.category) tags.unshift(String(j.category));
      return {
        source: 'remotive',
        source_job_id: id,
        title,
        company: j.company_name ? String(j.company_name).trim() : null,
        location: j.candidate_required_location
          ? String(j.candidate_required_location)
          : 'Remote',
        salary_text: j.salary ? String(j.salary) : null,
        tags: [...tags, search, 'remote'].filter(Boolean).slice(0, 12),
        apply_url: apply,
        company_logo: j.company_logo ? String(j.company_logo) : null,
        excerpt: j.description ? truncate(stripHtml(String(j.description))) : null,
        posted_at: j.publication_date ? String(j.publication_date) : null,
        raw: { id: j.id, search },
      };
    })
    .filter(Boolean);
}

async function fetchHimalayas(q) {
  const data = await fetchJson(
    `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&limit=20`,
  );
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  return jobs
    .map((j) => {
      const apply = String(j.applicationLink || j.guid || '').trim();
      const title = String(j.title ?? '').trim();
      if (!apply || !title) return null;
      const id = createHash('sha1').update(apply).digest('hex').slice(0, 16);
      const cats = Array.isArray(j.categories) ? j.categories.map(String) : [];
      const salary_text = formatSalaryUsd(j.minSalary, j.maxSalary);
      const locs = Array.isArray(j.locationRestrictions)
        ? j.locationRestrictions.map(String).join(', ')
        : null;
      return {
        source: 'himalayas',
        source_job_id: id,
        title,
        company: j.companyName ? String(j.companyName) : null,
        location: locs || 'Remote',
        salary_text,
        tags: [...cats, q, 'remote', 'web3'].filter(Boolean).slice(0, 12),
        apply_url: apply,
        company_logo: j.companyLogo ? String(j.companyLogo) : null,
        excerpt: j.excerpt
          ? truncate(stripHtml(String(j.excerpt)))
          : j.description
            ? truncate(stripHtml(String(j.description)))
            : null,
        posted_at: j.pubDate ? String(j.pubDate) : null,
        raw: { guid: j.guid, q },
      };
    })
    .filter(Boolean);
}

async function main() {
  console.log('Fetching Jobicy + RemoteOK + Remotive + Himalayas + web3.career…');
  const tasks = [
    fetchJobicy('crypto'),
    fetchJobicy('blockchain'),
    fetchRemoteOk('web3'),
    fetchRemoteOk('blockchain'),
    fetchRemoteOk('crypto'),
    fetchRemoteOk('defi'),
    fetchRemotive('blockchain'),
    fetchRemotive('crypto'),
    fetchRemotive('web3'),
    fetchHimalayas('web3'),
    fetchHimalayas('solidity'),
    fetchHimalayas('blockchain'),
    fetchWeb3Career({ limit: 100 }),
    fetchWeb3Career({ limit: 100, remote: true }),
    fetchWeb3Career({ limit: 50, tag: 'solidity' }),
    fetchWeb3Career({ limit: 50, tag: 'rust' }),
  ];
  const settled = await Promise.allSettled(tasks);
  const jobs = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') jobs.push(...s.value);
    else console.warn(s.reason?.message || s.reason);
  }

  if (!WEB3_CAREER_TOKEN) {
    console.warn('WEB3_CAREER_API_TOKEN missing — skipped web3.career');
  }

  const seen = new Set();
  const unique = jobs.filter((j) => {
    const k = `${j.source}:${j.source_job_id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return isWeb3Relevant(j);
  });

  const now = new Date().toISOString();
  const rows = unique.map((j) => ({
    source: j.source,
    source_job_id: j.source_job_id,
    title: j.title,
    company: j.company,
    location: j.location,
    salary_text: j.salary_text,
    tags: j.tags,
    apply_url: j.apply_url,
    company_logo: j.company_logo,
    excerpt: j.excerpt,
    posted_at: normalizePostedAt(j.posted_at),
    fetched_at: now,
    is_active: true,
    raw: j.raw ?? null,
  }));

  console.log(`Upserting ${rows.length} jobs…`);
  const { error } = await sb.from('arcusx_external_jobs').upsert(rows, {
    onConflict: 'source,source_job_id',
  });
  if (error) {
    console.error(error);
    process.exit(1);
  }

  const keepKeys = new Set(rows.map((r) => `${r.source}::${r.source_job_id}`));
  const { data: activeRows } = await sb
    .from('arcusx_external_jobs')
    .select('id, source, source_job_id')
    .eq('is_active', true);
  const dropIds = (activeRows || [])
    .filter((r) => !keepKeys.has(`${r.source}::${r.source_job_id}`))
    .map((r) => r.id);
  if (dropIds.length) {
    for (let i = 0; i < dropIds.length; i += 200) {
      await sb
        .from('arcusx_external_jobs')
        .update({ is_active: false })
        .in('id', dropIds.slice(i, i + 200));
    }
  }

  const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  await sb
    .from('arcusx_external_jobs')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('fetched_at', cutoff);

  const { count } = await sb
    .from('arcusx_external_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log('OK', {
    upserted: rows.length,
    active: count,
    jobicy: unique.filter((j) => j.source === 'jobicy').length,
    remoteok: unique.filter((j) => j.source === 'remoteok').length,
    remotive: unique.filter((j) => j.source === 'remotive').length,
    himalayas: unique.filter((j) => j.source === 'himalayas').length,
    web3career: unique.filter((j) => j.source === 'web3career').length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
