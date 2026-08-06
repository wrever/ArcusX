/**
 * Normalize external Web3 jobs from public APIs + role/location helpers for board filters.
 */

export type ExternalJob = {
  id: string;
  source: string;
  title: string;
  company: string | null;
  location: string | null;
  salary_text: string | null;
  tags: string[];
  apply_url: string;
  company_logo: string | null;
  excerpt: string | null;
  posted_at: string | null;
  badge: 'externa';
  origin: 'external';
  role: ExternalRole;
  is_remote: boolean;
};

export type ExternalRole =
  | 'engineering'
  | 'design'
  | 'marketing'
  | 'sales'
  | 'product'
  | 'community'
  | 'operations'
  | 'other';

export const EXTERNAL_ROLE_CHIPS: { id: ExternalRole | 'all'; labelKey: string }[] = [
  { id: 'all', labelKey: 'dashboard.jobs.chip.allRoles' },
  { id: 'engineering', labelKey: 'dashboard.jobs.chip.engineering' },
  { id: 'design', labelKey: 'dashboard.jobs.chip.design' },
  { id: 'marketing', labelKey: 'dashboard.jobs.chip.marketing' },
  { id: 'sales', labelKey: 'dashboard.jobs.chip.sales' },
  { id: 'product', labelKey: 'dashboard.jobs.chip.product' },
  { id: 'community', labelKey: 'dashboard.jobs.chip.community' },
  { id: 'operations', labelKey: 'dashboard.jobs.chip.operations' },
];

const UA = 'ArcusXJobBot/1.0 (+https://arcusx.pro)';

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, n = 220): string {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

const WEB3_RE =
  /\b(crypto|blockchain|web3|defi|nft|dao|solidity|ethereum|bitcoin|btc|eth|solana|stellar|soroban|token|on-?chain|smart\s*contract|wallet|dex|cex|stablecoin|layer\s*2|\bl2\b|zk|zero.?knowledge|protocol|metamask|binance|coinbase|okx|kraken|uniswap|aave|polygon|avalanche|cosmos|near|sui|aptos|ripple|xrp|tron|\bbase\b|\bop\b|optimism|arbitrum)\b/i;

function isWeb3Relevant(job: Pick<ExternalJob, 'title' | 'company' | 'tags' | 'excerpt'>): boolean {
  const blob = `${job.title} ${job.company || ''} ${job.tags.join(' ')} ${job.excerpt || ''}`;
  return WEB3_RE.test(blob);
}

export function inferIsRemote(location: string | null, tags: string[]): boolean {
  const blob = `${location || ''} ${tags.join(' ')}`.toLowerCase();
  return /\bremote\b|\bworldwide\b|\banywhere\b|\bdistributed\b/.test(blob) || !location;
}

export function inferRole(title: string, tags: string[]): ExternalRole {
  const blob = `${title} ${tags.join(' ')}`.toLowerCase();
  if (/\b(engineer|developer|solidity|rust|backend|frontend|full.?stack|devops|sre|smart contract|protocol)\b/.test(blob)) {
    return 'engineering';
  }
  if (/\b(design|designer|figma|ui\/ux|brand|visual)\b/.test(blob)) return 'design';
  if (/\b(market|growth|content|social|seo|brand manager|community manager)\b/.test(blob)) {
    if (/\bcommunity\b/.test(blob)) return 'community';
    return 'marketing';
  }
  if (/\b(sales|business development|bd\b|account executive|partnerships|revenue)\b/.test(blob)) {
    return 'sales';
  }
  if (/\b(product manager|product lead|pm\b|product owner)\b/.test(blob)) return 'product';
  if (/\b(community|discord|moderator)\b/.test(blob)) return 'community';
  if (/\b(operations|ops|finance|hr|people|support|customer success)\b/.test(blob)) {
    return 'operations';
  }
  return 'other';
}

function enrich(job: Omit<ExternalJob, 'role' | 'is_remote' | 'badge' | 'origin'>): ExternalJob {
  const role = inferRole(job.title, job.tags);
  const is_remote = inferIsRemote(job.location, job.tags);
  return {
    ...job,
    badge: 'externa',
    origin: 'external',
    role,
    is_remote,
  };
}

async function fetchJobicyTag(tag: string): Promise<ExternalJob[]> {
  const res = await fetch(
    `https://jobicy.com/api/v2/remote-jobs?count=40&tag=${encodeURIComponent(tag)}`,
    { headers: { Accept: 'application/json', 'User-Agent': UA } },
  );
  if (!res.ok) throw new Error(`jobicy/${tag} ${res.status}`);
  const data = await res.json();
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  return jobs
    .map((j: Record<string, unknown>) => {
      const id = String(j.id ?? '');
      const title = String(j.jobTitle ?? '').trim();
      const apply = String(j.url ?? '').trim();
      if (!id || !title || !apply) return null;
      const industry = Array.isArray(j.jobIndustry)
        ? (j.jobIndustry as string[]).map((x) => stripHtml(String(x)))
        : [];
      const types = Array.isArray(j.jobType)
        ? (j.jobType as string[]).map(String)
        : [];
      return enrich({
        id: `jobicy:${id}`,
        source: 'jobicy',
        title,
        company: j.companyName ? String(j.companyName) : null,
        location: j.jobGeo ? String(j.jobGeo) : 'Remote',
        salary_text: null,
        tags: [...types, ...industry, tag, 'web3'].filter(Boolean).slice(0, 10),
        apply_url: apply,
        company_logo: j.companyLogo ? String(j.companyLogo) : null,
        excerpt: j.jobExcerpt ? truncate(stripHtml(String(j.jobExcerpt))) : null,
        posted_at: j.pubDate ? String(j.pubDate) : null,
      });
    })
    .filter(Boolean) as ExternalJob[];
}

async function fetchRemoteOkTag(tag: string): Promise<ExternalJob[]> {
  const res = await fetch(`https://remoteok.com/api?tags=${encodeURIComponent(tag)}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`remoteok/${tag} ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const out: ExternalJob[] = [];
  for (const j of data) {
    if (!j?.id || !j?.position) continue;
    const apply = String(j.apply_url || j.url || '').trim();
    const title = String(j.position).trim();
    if (!apply || !title) continue;
    const tags = Array.isArray(j.tags) ? j.tags.map(String).slice(0, 10) : [tag];
    // No publicamos sueldos: los feeds no son confiables / no los validamos.
    out.push(
      enrich({
        id: `remoteok:${j.id}`,
        source: 'remoteok',
        title,
        company: j.company ? String(j.company) : null,
        location: j.location ? String(j.location) : 'Remote',
        salary_text: null,
        tags: tags.length ? tags : [tag],
        apply_url: apply,
        company_logo: j.company_logo || j.logo || null,
        excerpt: j.description ? truncate(stripHtml(String(j.description))) : null,
        posted_at: j.date ? String(j.date) : null,
      }),
    );
  }
  return out;
}

async function fetchFromEdge(search?: string): Promise<ExternalJob[]> {
  const { arcusxApiUrl, arcusxApiHeaders } = await import('../config/arcusxApi');
  const params = new URLSearchParams({ limit: '80' });
  if (search?.trim()) params.set('search', search.trim());
  const res = await fetch(arcusxApiUrl('get_external_jobs', params), {
    headers: arcusxApiHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  return jobs
    .map((j: Record<string, unknown>) => {
      const title = String(j.title ?? '');
      const tags = Array.isArray(j.tags) ? j.tags.map(String) : [];
      const apply_url = String(j.apply_url ?? '');
      if (!title || !apply_url) return null;
      return enrich({
        id: `db:${j.id ?? `${j.source}:${j.source_job_id}`}`,
        source: String(j.source ?? 'external'),
        title,
        company: j.company ? String(j.company) : null,
        location: j.location ? String(j.location) : null,
        salary_text: null,
        tags,
        apply_url,
        company_logo: j.company_logo ? String(j.company_logo) : null,
        excerpt: j.excerpt ? String(j.excerpt) : null,
        posted_at: j.posted_at ? String(j.posted_at) : null,
      });
    })
    .filter(Boolean) as ExternalJob[];
}

/** Live multi-source pull (Jobicy + RemoteOK). New listings appear on refresh. */
export async function fetchLiveExternalJobs(search?: string): Promise<ExternalJob[]> {
  const jobicyTags = ['crypto', 'blockchain'];
  const remoteTags = ['web3', 'blockchain', 'crypto', 'defi'];
  const settled = await Promise.allSettled([
    ...jobicyTags.map((t) => fetchJobicyTag(t)),
    ...remoteTags.map((t) => fetchRemoteOkTag(t)),
  ]);
  let jobs: ExternalJob[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') jobs = jobs.concat(s.value);
  }
  const q = search?.trim().toLowerCase();
  if (q) {
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.company || '').toLowerCase().includes(q) ||
        (j.excerpt || '').toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  const seen = new Set<string>();
  return jobs
    .filter((j) => isWeb3Relevant(j))
    .filter((j) => {
      const key = j.apply_url.split('?')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const ta = a.posted_at ? Date.parse(a.posted_at) : 0;
      const tb = b.posted_at ? Date.parse(b.posted_at) : 0;
      return tb - ta;
    })
    .slice(0, 80);
}

/**
 * Prefer DB cache (cron sync). If empty, live-fetch so the board never looks empty
 * and new postings appear on each visit/refresh.
 */
export async function loadExternalJobs(search?: string): Promise<ExternalJob[]> {
  try {
    const cached = await fetchFromEdge(search);
    if (cached.length >= 8) return cached;
  } catch {
    /* fall through */
  }
  return fetchLiveExternalJobs(search);
}

export function filterExternalJobs(
  jobs: ExternalJob[],
  opts: {
    role?: ExternalRole | 'all';
    remoteOnly?: boolean;
    search?: string;
  },
): ExternalJob[] {
  let out = jobs;
  if (opts.role && opts.role !== 'all') {
    out = out.filter((j) => j.role === opts.role);
  }
  if (opts.remoteOnly) {
    out = out.filter((j) => j.is_remote);
  }
  const q = opts.search?.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.company || '').toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  return out;
}
