import { getSqlPool, sql } from '../config/db.js';

const ALLOWED_PAGE_SIZES = [20, 50, 100, 200, 500] as const;
const DEFAULT_SORT_FIELD = 'PermitDate';
const DEFAULT_SORT_DIRECTION = 'desc';

export type PermitField =
  | 'PermitDate'
  | 'PermitNumber'
  | 'Applicant'
  | 'PermitAddress'
  | 'PermitType'
  | 'PermitStatus';

export type SortDirection = 'asc' | 'desc';

export interface PermitRow {
  PermitID: number | null;
  PermitDate: string | null;
  PermitNumber: string | null;
  Applicant: string | null;
  PermitAddress: string | null;
  PermitType: string | null;
  PermitStatus: string | null;
}

export interface PermitQueryParams {
  systemId?: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
  page?: string | number | null;
  pageSize?: string | number | null;
  sortField?: string | null;
  sortDirection?: string | null;
}

export interface PermitPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PermitSort {
  field: PermitField;
  direction: SortDirection;
}

export interface PermitListResponse {
  data: PermitRow[];
  pagination: PermitPagination;
  sort: PermitSort;
}

const fieldMap: Record<string, PermitField> = {
  PermitDate: 'PermitDate',
  PermitNumber: 'PermitNumber',
  Applicant: 'Applicant',
  PermitAddress: 'PermitAddress',
  PermitType: 'PermitType',
  PermitStatus: 'PermitStatus',
};

export function parseOptionalInt(value: string | number | null | undefined, fallback: number | null): number | null {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseOptionalDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue.toISOString().slice(0, 10);
}

export function normalizeSort(sortField?: string | null, sortDirection?: string | null): { safeField: PermitField; normalizedDirection: SortDirection } {
  const safeField = (fieldMap[String(sortField ?? DEFAULT_SORT_FIELD)] ?? DEFAULT_SORT_FIELD) as PermitField;
  const normalizedDirection = sortDirection === 'asc' ? 'asc' : 'desc';
  return { safeField, normalizedDirection };
}

export function applySorting(rows: PermitRow[], sortField?: string | null, sortDirection?: string | null): PermitRow[] {
  const { safeField, normalizedDirection } = normalizeSort(sortField, sortDirection);

  return [...rows].sort((a, b) => {
    const left = a[safeField] ?? '';
    const right = b[safeField] ?? '';

    const leftValue = String(left);
    const rightValue = String(right);
    const result = leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
    return normalizedDirection === 'asc' ? result : -result;
  });
}

export async function getPermits(params: PermitQueryParams = {}, poolFactory: typeof getSqlPool = getSqlPool): Promise<PermitListResponse> {
  const systemId = parseOptionalInt(params.systemId ?? null, null);
  const startDate = parseOptionalDate(params.startDate ?? undefined);
  const endDate = parseOptionalDate(params.endDate ?? undefined);
  const page = Math.max(parseOptionalInt(params.page ?? 1, 1) ?? 1, 1);
  const requestedPageSize = parseOptionalInt(params.pageSize ?? 20, 20) ?? 20;
  const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize as typeof ALLOWED_PAGE_SIZES[number])
    ? requestedPageSize
    : 20;

  const { safeField, normalizedDirection } = normalizeSort(params.sortField, params.sortDirection);

  const pool = await poolFactory();
  const request = pool.request();

  request.input('systemId', sql.Int, systemId ?? null);
  request.input('startDate', sql.Date, startDate ?? null);
  request.input('endDate', sql.Date, endDate ?? null);

  const result = await request.execute('dbo.colsp_ListPermits');
  const rows: PermitRow[] = (result.recordset ?? []).map((row: Record<string, unknown>) => ({
    PermitID: typeof row.PermitID === 'number' ? row.PermitID : null,
    PermitDate: typeof row.PermitDate === 'string' || row.PermitDate instanceof Date ? (row.PermitDate instanceof Date ? row.PermitDate.toISOString().slice(0, 10) : new Date(row.PermitDate).toISOString().slice(0, 10)) : null,
    PermitNumber: typeof row.PermitNumber === 'string' ? row.PermitNumber : null,
    Applicant: typeof row.Applicant === 'string' ? row.Applicant : null,
    PermitAddress: typeof row.PermitAddress === 'string' ? row.PermitAddress : null,
    PermitType: typeof row.PermitType === 'string' ? row.PermitType : null,
    PermitStatus: typeof row.PermitStatus === 'string' ? row.PermitStatus : null,
  }));

  const sortedRows = applySorting(rows, safeField, normalizedDirection);
  const total = sortedRows.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRows = sortedRows.slice(startIndex, startIndex + pageSize);

  return {
    data: pagedRows,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
    sort: {
      field: safeField,
      direction: normalizedDirection,
    },
  };
}
