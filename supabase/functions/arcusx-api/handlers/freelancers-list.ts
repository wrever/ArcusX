import { jsonError, jsonResponse } from '../../_shared/arcusx-cors.ts';
import type { ApiContext } from './types.ts';
import { qp, qpInt } from './types.ts';
import { parseSkills } from './stats-helpers.ts';
import { normalizeDisplayText } from '../../_shared/text-encoding.ts';

type FreelancerRow = {
  id: number;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  skills: unknown;
  average_rating: number;
  total_ratings: number;
  tasks_completed: number;
  total_earned: number;
  public_profile: boolean;
  joined_date: string;
};

function profileScore(row: {
  avatar_url: string | null;
  bio: string | null;
  skills: unknown;
}): number {
  let score = 0;
  if (row.avatar_url?.trim()) score += 1000;
  if (row.bio?.trim()) score += 500;
  const skills = parseSkills(row.skills);
  if (skills.length > 0) score += 200;
  return score;
}

export async function getFreelancers(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const page = Math.max(1, qpInt(url, 'page') ?? 1);
  const limit = Math.min(100, Math.max(1, qpInt(url, 'limit') ?? 20));
  const search = qp(url, 'search');
  const minRating = Number(url.searchParams.get('min_rating') ?? '0') || 0;
  const minTasks = Math.max(0, qpInt(url, 'min_tasks') ?? 0);
  const sortByRaw = qp(url, 'sort_by') || 'rating';
  const sortBy = ['rating', 'tasks_completed', 'joined_date', 'total_earned'].includes(sortByRaw)
    ? sortByRaw
    : 'rating';
  const sortOrder = (url.searchParams.get('sort_order') ?? 'desc').toUpperCase() === 'ASC'
    ? 'asc'
    : 'desc';
  const preferProfile = ['1', 'true'].includes(
    (url.searchParams.get('prefer_profile') ?? '').toLowerCase(),
  );

  let userQuery = supabase
    .from('arcusx_users')
    .select(
      'id, username, avatar_url, bio, skills, average_rating, total_ratings, completed_tasks_count, created_at, public_profile, is_admin',
    )
    .eq('public_profile', true);

  if (search) {
    userQuery = userQuery.ilike('username', `%${search}%`);
  }

  const { data: users, error: usersErr } = await userQuery;
  if (usersErr) return jsonError(req, usersErr.message, 500);

  const eligible = (users ?? []).filter(
    (u) => !u.is_admin && u.public_profile !== false && u.public_profile !== 0,
  );

  const userIds = eligible.map((u) => u.id as number);
  if (userIds.length === 0) {
    return jsonResponse(req, {
      success: true,
      freelancers: [],
      pagination: { total: 0, page, limit, total_pages: 0 },
    });
  }

  const [{ data: ratings }, { data: completedTasks }] = await Promise.all([
    supabase.from('arcusx_ratings').select('rated_id, rating').in('rated_id', userIds),
    supabase
      .from('arcusx_tasks')
      .select('accepted_applicant_id, price')
      .in('accepted_applicant_id', userIds)
      .eq('status', 'completed')
      .eq('escrow_status', 'completed'),
  ]);

  const ratingMap = new Map<number, { sum: number; count: number }>();
  for (const r of ratings ?? []) {
    const id = r.rated_id as number;
    const cur = ratingMap.get(id) ?? { sum: 0, count: 0 };
    cur.sum += Number(r.rating ?? 0);
    cur.count += 1;
    ratingMap.set(id, cur);
  }

  const tasksMap = new Map<number, { count: number; earned: number }>();
  for (const t of completedTasks ?? []) {
    const id = t.accepted_applicant_id as number;
    if (!id) continue;
    const cur = tasksMap.get(id) ?? { count: 0, earned: 0 };
    cur.count += 1;
    cur.earned += Number(t.price ?? 0);
    tasksMap.set(id, cur);
  }

  let rows: FreelancerRow[] = eligible.map((u) => {
    const id = u.id as number;
    const r = ratingMap.get(id);
    const tc = tasksMap.get(id);
    const avgFromRatings = r && r.count > 0 ? r.sum / r.count : 0;
    const averageRating = Number(u.average_rating ?? 0) || avgFromRatings;
    const totalRatings = Number(u.total_ratings ?? 0) || (r?.count ?? 0);
    const tasksCompleted = tc?.count ?? Number(u.completed_tasks_count ?? 0);
    return {
      id,
      username: String(u.username ?? ''),
      avatar_url: (u.avatar_url as string | null) ?? null,
      bio: normalizeDisplayText((u.bio as string | null) ?? '') || null,
      skills: u.skills,
      average_rating: Math.round(averageRating * 100) / 100,
      total_ratings: totalRatings,
      tasks_completed: tasksCompleted,
      total_earned: Math.round((tc?.earned ?? 0) * 100) / 100,
      public_profile: true,
      joined_date: String(u.created_at ?? new Date().toISOString()),
    };
  });

  if (minRating > 0) {
    rows = rows.filter((f) => f.average_rating >= minRating);
  }
  if (minTasks > 0) {
    rows = rows.filter((f) => f.tasks_completed >= minTasks);
  }

  rows.sort((a, b) => {
    if (preferProfile) {
      const ps = profileScore(b) - profileScore(a);
      if (ps !== 0) return ps;
    }
    let cmp = 0;
    switch (sortBy) {
      case 'tasks_completed':
        cmp = a.tasks_completed - b.tasks_completed;
        break;
      case 'joined_date':
        cmp = new Date(a.joined_date).getTime() - new Date(b.joined_date).getTime();
        break;
      case 'total_earned':
        cmp = a.total_earned - b.total_earned;
        break;
      default:
        cmp = a.average_rating - b.average_rating;
        if (cmp === 0) cmp = a.tasks_completed - b.tasks_completed;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const total = rows.length;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  const from = (page - 1) * limit;
  const pageRows = rows.slice(from, from + limit);

  const freelancers = pageRows.map((f) => ({
    ...f,
    skills: parseSkills(f.skills),
  }));

  return jsonResponse(req, {
    success: true,
    freelancers,
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
    },
  });
}
