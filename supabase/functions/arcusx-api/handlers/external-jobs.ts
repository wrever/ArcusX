/**
 * External Web3 jobs board — list + sync from public job APIs.
 * Jobicy + RemoteOK + web3.career (WEB3_CAREER_API_TOKEN, server-only).
 * HTML scrapers of cryptojobslist / wwshemi / laborx / cryptocurrencyjobs are blocked.
 *
 * web3.career terms: use apply_url as-is with follow link (no nofollow); never expose token to clients.
 * Docs: https://docs.bondex.app/api-reference
 */

import { jsonError, jsonResponse } from '../../_shared/arcusx-cors.ts';
import type { ApiContext } from './types.ts';

const USER_AGENT = 'ArcusXJobBot/1.0 (+https://arcusx.pro; jobs aggregator)';
const MAX_JOBS_RETURN = 80;

type NormalizedJob = {
  source: string;
  source_job_id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary_text: string | null;
  tags: string[];
  apply_url: string;
  company_logo: string | null;
  excerpt: string | null;
  posted_at: string | null;
  raw?: unknown;
};

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, n = 280): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

/** Drop generic remote jobs that slip into crypto/web3 API tags. */
const WEB3_RE =
  /\b(crypto|blockchain|web3|defi|nft|dao|solidity|ethereum|bitcoin|btc|eth|solana|stellar|soroban|token|on-?chain|smart\s*contract|wallet|dex|cex|stablecoin|layer\s*2|\bl2\b|zk|zero.?knowledge|protocol|metamask|binance|coinbase|okx|kraken|uniswap|aave|polygon|avalanche|cosmos|near|sui|aptos|ripple|xrp|tron|\bbase\b|\bop\b|optimism|arbitrum)\b/i;

function isWeb3Relevant(job: NormalizedJob): boolean {
  if (job.source === 'web3career') return true;
  const blob = `${job.title} ${job.company || ''} ${job.tags.join(' ')} ${job.excerpt || ''}`;
  return WEB3_RE.test(blob);
}

function formatSalaryUsd(min: unknown, max: unknown): string | null {
  const a = Number(min);
  const b = Number(max);
  if (Number.isFinite(a) && a > 0 && Number.isFinite(b) && b > 0) {
    return `$${Math.round(a / 1000)}k–$${Math.round(b / 1000)}k`;
  }
  if (Number.isFinite(a) && a > 0) return `$${Math.round(a / 1000)}k+`;
  return null;
}

function normalizePostedAt(value: unknown): string | null {
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

const AGGREGATOR_HOSTS = [
  'web3.career',
  'remotive.com',
  'remoteok.com',
  'remoteok.io',
  'jobicy.com',
  'himalayas.app',
  'cryptojobslist.com',
  'wwshemi.com',
  'bondex.app',
  'network.bondex.app',
];

const ATS_HINT =
  /recruitee\.com|greenhouse\.io|boards\.greenhouse|lever\.co|jobs\.lever|ashbyhq\.com|jobs\.ashby|workable\.com|apply\.workable|smartrecruiters\.com|jobvite\.com|bamboohr\.com|myworkdayjobs\.com|wellfound\.com|linkedin\.com\/jobs|indeed\.com\/(viewjob|jobs)|applytojob\.com|personio\.(de|com)|teamtailor\.com|vonq\.io|testedrecruits\.com|workada\.com|jobs\.[a-z0-9-]+\.[a-z]{2,}|careers\.[a-z0-9-]+\.[a-z]{2,}|apply\.[a-z0-9-]+\.[a-z]{2,}|\/careers\/[a-z0-9][\w%.-]{2,}|\/jobs\/[a-z0-9][\w%.-]{2,}|\/job\/[a-z0-9][\w%.-]{2,}/i;

const BAD_PATH =
  /\/(privacy|cookie|blog|news|about|login|signup|terms|tos|help|support|status|diversity)(\/|$|\?)|recruitment-fraud|best-practices|avoid-fraud/i;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isAggregatorUrl(url: string): boolean {
  const host = hostOf(url);
  return AGGREGATOR_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

function cleanUrl(u: string): string {
  return String(u || '')
    .replace(/&amp;/g, '&')
    .replace(/[),.;]+$/g, '')
    .trim();
}

function isPlausibleEmployerUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/^https?:$/i.test(u.protocol)) return false;
    if (isAggregatorUrl(url)) return false;
    const host = u.hostname.toLowerCase();
    if (
      /twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|tiktok\.com|medium\.com|substack\.com|t\.me|discord\.gg|discord\.com|github\.com|notion\.so|figma\.com|google\.com|goo\.gl|bit\.ly|t\.co|cdn\.|static\./i
        .test(host)
    ) {
      return false;
    }
    if (BAD_PATH.test(u.pathname)) return false;
    if (u.pathname.length < 2 && !ATS_HINT.test(url)) return false;
    return true;
  } catch {
    return false;
  }
}

function extractEmployerUrlFromHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const urls = [...String(html).matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((m) =>
    cleanUrl(m[0]),
  );
  const unique = [...new Set(urls)].filter(isPlausibleEmployerUrl);
  const ats = unique.find((u) => ATS_HINT.test(u));
  if (ats) return ats;
  return null;
}

type JobWithDesc = NormalizedJob & { _descriptionHtml?: string | null };

function preferDirectApply(job: JobWithDesc): NormalizedJob {
  const original = job.apply_url;
  const direct =
    extractEmployerUrlFromHtml(job._descriptionHtml || '') ||
    extractEmployerUrlFromHtml(job.excerpt || '');
  const { _descriptionHtml: _drop, ...base } = job;
  if (direct && !isAggregatorUrl(direct) && direct !== original) {
    return {
      ...base,
      apply_url: direct,
      raw: {
        ...(typeof base.raw === 'object' && base.raw ? base.raw as Record<string, unknown> : {}),
        aggregator_apply_url: original,
        employer_apply_resolved: true,
      },
    };
  }
  return base;
}

function parseTitleCompany(
  titleRaw: unknown,
  companyRaw: unknown,
): { title: string; company: string | null } {
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

async function sha1Short(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`${url.split('?')[0]} → HTTP ${res.status}`);
  return res.json();
}

async function fetchJobicy(tag: string): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`,
  )) as { jobs?: Record<string, unknown>[] };
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  return jobs
    .map((j) => {
      const id = String(j.id ?? '');
      const title = String(j.jobTitle ?? '').trim();
      const url = String(j.url ?? '').trim();
      if (!id || !title || !url) return null;
      const industry = Array.isArray(j.jobIndustry)
        ? (j.jobIndustry as string[]).map((x) => stripHtml(String(x)))
        : [];
      const types = Array.isArray(j.jobType)
        ? (j.jobType as string[]).map((x) => String(x))
        : [];
      return {
        source: 'jobicy',
        source_job_id: id,
        title,
        company: j.companyName ? String(j.companyName) : null,
        location: j.jobGeo ? String(j.jobGeo) : 'Remote',
        salary_text: null,
        tags: [...types, ...industry, tag, 'web3'].filter(Boolean).slice(0, 12),
        apply_url: url,
        company_logo: j.companyLogo ? String(j.companyLogo) : null,
        excerpt: j.jobExcerpt ? truncate(stripHtml(String(j.jobExcerpt))) : null,
        posted_at: j.pubDate ? String(j.pubDate) : null,
        raw: { id: j.id, tag },
        _descriptionHtml: j.jobDescription
          ? String(j.jobDescription)
          : j.jobExcerpt
            ? String(j.jobExcerpt)
            : null,
      } as JobWithDesc;
    })
    .filter(Boolean) as JobWithDesc[];
}

async function fetchRemoteOk(tag: string): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://remoteok.com/api?tags=${encodeURIComponent(tag)}`,
  )) as unknown[];
  if (!Array.isArray(data)) return [];
  const out: NormalizedJob[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const j = row as Record<string, unknown>;
    if (!j.id || !j.position) continue;
    const apply = String(j.apply_url || j.url || '').trim();
    const title = String(j.position).trim();
    if (!apply || !title) continue;
    const tags = Array.isArray(j.tags)
      ? (j.tags as unknown[]).map((t) => String(t)).slice(0, 12)
      : [tag];
    let salary: string | null = null;
    const min = Number(j.salary_min);
    const max = Number(j.salary_max);
    if (Number.isFinite(min) && min > 0 && Number.isFinite(max) && max > 0) {
      salary = `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k`;
    }
    out.push({
      source: 'remoteok',
      source_job_id: String(j.id),
      title,
      company: j.company ? String(j.company) : null,
      location: j.location ? String(j.location) : 'Remote',
      salary_text: salary,
      tags: tags.length ? tags : [tag],
      apply_url: apply,
      company_logo: j.company_logo
        ? String(j.company_logo)
        : j.logo
          ? String(j.logo)
          : null,
      excerpt: j.description ? truncate(stripHtml(String(j.description))) : null,
      posted_at: j.date ? String(j.date) : null,
      raw: { id: j.id, slug: j.slug, tag },
      _descriptionHtml: j.description ? String(j.description) : null,
    } as JobWithDesc);
  }
  return out;
}

function extractWeb3CareerJobs(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  const nested = data.find((item) => Array.isArray(item));
  if (Array.isArray(nested)) {
    return nested.filter(
      (j): j is Record<string, unknown> =>
        !!j && typeof j === 'object' && !!(j as Record<string, unknown>).apply_url,
    );
  }
  if (data.length && typeof data[0] === 'object' && data[0] && (data[0] as Record<string, unknown>).apply_url) {
    return data.filter(
      (j): j is Record<string, unknown> =>
        !!j && typeof j === 'object' && !!(j as Record<string, unknown>).apply_url,
    );
  }
  return [];
}

async function fetchWeb3Career(opts: {
  limit?: number;
  remote?: boolean;
  tag?: string;
}): Promise<NormalizedJob[]> {
  const token = String(Deno.env.get('WEB3_CAREER_API_TOKEN') || '').trim();
  if (!token) return [];

  const qs = new URLSearchParams({
    token,
    limit: String(opts.limit ?? 100),
    show_description: 'true',
  });
  if (opts.remote) qs.set('remote', 'true');
  if (opts.tag) qs.set('tag', opts.tag);

  const res = await fetch(`https://web3.career/api/v1?${qs}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`web3.career → HTTP ${res.status}`);
  const data = await res.json();
  const jobs = extractWeb3CareerJobs(data);
  const out: NormalizedJob[] = [];
  for (const j of jobs) {
    const apply = String(j.apply_url || '').trim();
    if (!apply) continue;
    const { title, company } = parseTitleCompany(j.title, j.company);
    if (!title) continue;
    const id = j.id != null ? String(j.id) : await sha1Short(apply);
    const tags = Array.isArray(j.tags)
      ? (j.tags as unknown[]).map((t) => String(t)).slice(0, 12)
      : [];
    const salary_text =
      formatSalaryUsd(j.salary_min_value, j.salary_max_value) ||
      formatSalaryUsd(j.estimated_min_salary, j.estimated_max_salary);
    let location = j.location ? String(j.location).trim() : null;
    if (j.is_remote === true || (!location && opts.remote)) {
      location = location ? `Remote · ${location}` : 'Remote';
    }
    let posted_at: string | null = null;
    if (j.date_epoch) {
      posted_at = new Date(Number(j.date_epoch) * 1000).toISOString();
    } else if (j.date) {
      const t = Date.parse(String(j.date));
      posted_at = Number.isFinite(t) ? new Date(t).toISOString() : String(j.date);
    }
    out.push({
      source: 'web3career',
      source_job_id: id,
      title,
      company,
      location,
      salary_text,
      tags: tags.length ? tags : ['web3'],
      apply_url: apply,
      company_logo: null,
      excerpt: j.description ? truncate(stripHtml(String(j.description))) : null,
      posted_at,
      raw: { id: j.id, country: j.country, is_remote: j.is_remote },
      _descriptionHtml: j.description ? String(j.description) : null,
    } as JobWithDesc);
  }
  return out;
}

async function fetchRemotive(search: string): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search)}&limit=40`,
  )) as { jobs?: Record<string, unknown>[] };
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  return jobs
    .map((j) => {
      const id = String(j.id ?? '');
      const title = String(j.title ?? '').trim();
      const apply = String(j.url ?? '').trim();
      if (!id || !title || !apply) return null;
      const tags = Array.isArray(j.tags)
        ? (j.tags as unknown[]).map((t) => String(t)).slice(0, 10)
        : [];
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
        _descriptionHtml: j.description ? String(j.description) : null,
      } as JobWithDesc;
    })
    .filter(Boolean) as JobWithDesc[];
}

async function fetchHimalayas(q: string): Promise<NormalizedJob[]> {
  const data = (await fetchJson(
    `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&limit=20`,
  )) as { jobs?: Record<string, unknown>[] };
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const out: NormalizedJob[] = [];
  for (const j of jobs) {
    const apply = String(j.applicationLink || j.guid || '').trim();
    const title = String(j.title ?? '').trim();
    if (!apply || !title) continue;
    const id = await sha1Short(apply);
    const cats = Array.isArray(j.categories)
      ? (j.categories as unknown[]).map((t) => String(t))
      : [];
    const locs = Array.isArray(j.locationRestrictions)
      ? (j.locationRestrictions as unknown[]).map(String).join(', ')
      : null;
    out.push({
      source: 'himalayas',
      source_job_id: id,
      title,
      company: j.companyName ? String(j.companyName) : null,
      location: locs || 'Remote',
      salary_text: formatSalaryUsd(j.minSalary, j.maxSalary),
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
      _descriptionHtml: j.description
        ? String(j.description)
        : j.excerpt
          ? String(j.excerpt)
          : null,
    } as JobWithDesc);
  }
  return out;
}

async function collectAllSources(): Promise<{ jobs: NormalizedJob[]; errors: string[] }> {
  const errors: string[] = [];
  const specs: Array<() => Promise<NormalizedJob[]>> = [
    () => fetchJobicy('crypto'),
    () => fetchJobicy('blockchain'),
    () => fetchRemoteOk('web3'),
    () => fetchRemoteOk('blockchain'),
    () => fetchRemoteOk('crypto'),
    () => fetchRemoteOk('defi'),
    () => fetchRemotive('blockchain'),
    () => fetchRemotive('crypto'),
    () => fetchRemotive('web3'),
    () => fetchHimalayas('web3'),
    () => fetchHimalayas('solidity'),
    () => fetchHimalayas('blockchain'),
    () => fetchWeb3Career({ limit: 100 }),
    () => fetchWeb3Career({ limit: 100, remote: true }),
    () => fetchWeb3Career({ limit: 50, tag: 'solidity' }),
    () => fetchWeb3Career({ limit: 50, tag: 'rust' }),
  ];
  const settled = await Promise.allSettled(specs.map((fn) => fn()));
  let collected: NormalizedJob[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') collected = collected.concat(s.value);
    else errors.push(s.reason instanceof Error ? s.reason.message : String(s.reason));
  }
  if (!String(Deno.env.get('WEB3_CAREER_API_TOKEN') || '').trim()) {
    errors.push('WEB3_CAREER_API_TOKEN not set — web3.career skipped');
  }
  const seen = new Set<string>();
  const jobs = collected
    .filter((j) => {
      const key = `${j.source}:${j.source_job_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return isWeb3Relevant(j);
    })
    .map((j) => preferDirectApply(j as JobWithDesc));
  return { jobs, errors };
}

export async function listExternalJobs(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const search = (url.searchParams.get('search') || '').trim();
  const limit = Math.min(
    MAX_JOBS_RETURN,
    Math.max(1, Number(url.searchParams.get('limit') || 60) || 60),
  );

  let q = supabase
    .from('arcusx_external_jobs')
    .select(
      'id, source, source_job_id, title, company, location, salary_text, tags, apply_url, company_logo, excerpt, posted_at, fetched_at',
    )
    .eq('is_active', true)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (search) {
    q = q.or(
      `title.ilike.%${search}%,company.ilike.%${search}%,excerpt.ilike.%${search}%`,
    );
  }

  const { data, error } = await q;
  if (error) {
    if (/does not exist|relation/i.test(error.message)) {
      return jsonResponse(req, { success: true, jobs: [], warning: 'external_jobs_unmigrated' });
    }
    return jsonError(req, error.message, 500);
  }

  const jobs = (data ?? []).map((row) => ({
    ...row,
    origin: 'external' as const,
    badge: 'externa' as const,
  }));

  return jsonResponse(req, { success: true, jobs, count: jobs.length });
}

export async function syncExternalJobs(ctx: ApiContext): Promise<Response> {
  const { req, supabase, body } = ctx;
  const secret = Deno.env.get('EXTERNAL_JOBS_SYNC_SECRET') || Deno.env.get('CRON_SECRET');
  const provided =
    String(body?.secret ?? '').trim() ||
    String(req.headers.get('x-arcusx-sync-secret') ?? '').trim();

  if (!secret || provided !== secret) {
    return jsonError(req, 'unauthorized', 401);
  }

  const { jobs: unique, errors } = await collectAllSources();
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

  if (rows.length === 0) {
    return jsonResponse(req, {
      success: false,
      upserted: 0,
      errors,
      message: 'No jobs fetched',
    });
  }

  const { error } = await supabase.from('arcusx_external_jobs').upsert(rows, {
    onConflict: 'source,source_job_id',
  });
  if (error) return jsonError(req, error.message, 500);

  const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('arcusx_external_jobs')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('fetched_at', cutoff);

  return jsonResponse(req, {
    success: true,
    upserted: rows.length,
    sources: {
      jobicy: unique.filter((j) => j.source === 'jobicy').length,
      remoteok: unique.filter((j) => j.source === 'remoteok').length,
      remotive: unique.filter((j) => j.source === 'remotive').length,
      himalayas: unique.filter((j) => j.source === 'himalayas').length,
      web3career: unique.filter((j) => j.source === 'web3career').length,
    },
    errors,
  });
}
