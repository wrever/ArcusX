/** Formato de paginación alineado con `adminService.ts` (PHP admin). */

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export function buildPagination(
  page: number,
  limit: number,
  total: number,
): AdminPagination {
  return {
    page,
    limit,
    total,
    total_pages: total > 0 ? Math.ceil(total / limit) : 1,
  };
}
