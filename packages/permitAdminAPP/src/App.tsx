import { useEffect, useMemo, useState } from 'react';

type PermitField = 'PermitDate' | 'PermitNumber' | 'Applicant' | 'PermitAddress' | 'PermitType' | 'PermitStatus';
type SortDirection = 'asc' | 'desc';

type PermitRow = {
  PermitID: number | null;
  PermitDate: string | null;
  PermitNumber: string | null;
  Applicant: string | null;
  PermitAddress: string | null;
  PermitType: string | null;
  PermitStatus: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type PermitApiResponse = {
  data: PermitRow[];
  pagination: Pagination;
  sort: {
    field: PermitField;
    direction: SortDirection;
  };
};

const PAGE_SIZES = [20, 50, 100, 200, 500] as const;
const columns: Array<{ key: PermitField; label: string }> = [
  { key: 'PermitDate', label: 'Permit Date' },
  { key: 'PermitNumber', label: 'Permit Number' },
  { key: 'Applicant', label: 'Name' },
  { key: 'PermitAddress', label: 'Address' },
  { key: 'PermitType', label: 'Permit Type' },
  { key: 'PermitStatus', label: 'Status' },
];

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function buildPermitQueryParams(page: number, pageSize: number, sortField: PermitField, sortDirection: SortDirection): URLSearchParams {
  return new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortField,
    sortDirection,
  });
}

export function getPageNumbers(totalPages: number): number[] {
  const numbers: number[] = [];
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    numbers.push(pageNumber);
  }
  return numbers;
}

export function toggleSort(currentField: PermitField, currentDirection: SortDirection, nextField: PermitField): { field: PermitField; direction: SortDirection } {
  if (currentField === nextField) {
    return { field: currentField, direction: currentDirection === 'asc' ? 'desc' : 'asc' };
  }
  return { field: nextField, direction: 'asc' };
}

export default function App() {
  const [rows, setRows] = useState<PermitRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortField, setSortField] = useState<PermitField>('PermitDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const fetchPermits = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params = buildPermitQueryParams(page, pageSize, sortField, sortDirection);

      const response = await fetch(`/api/permits?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Unable to load permits');
      }

      const payload = (await response.json()) as PermitApiResponse;
      setRows(payload.data || []);
      setPagination(payload.pagination || { page: 1, pageSize, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load permits';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPermits();
  }, [page, pageSize, sortField, sortDirection]);

  const handleSort = (field: PermitField): void => {
    const nextSort = toggleSort(sortField, sortDirection, field);
    setSortField(nextSort.field);
    setSortDirection(nextSort.direction);
  };

  const pageNumbers = useMemo<number[]>(() => {
    return getPageNumbers(pagination.totalPages);
  }, [pagination.totalPages]);

  return (
    <div className="page-shell">
      <header className="toolbar">
        <div>
          <h1>Permit Admin</h1>
          <p>Burn permit list</p>
        </div>
        <div className="toolbar-right">
          <label>
            Rows per page
            <select value={pageSize} onChange={(event) => {
              setPage(1);
              setPageSize(Number(event.target.value));
            }}>
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error ? <div className="error-panel">{error}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button type="button" className="sort-button" onClick={() => handleSort(column.key)}>
                    {column.label}
                    {sortField === column.key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="loading-cell">
                  Loading permits...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-cell">
                  No permits found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.PermitNumber}-${row.PermitDate}`}>
                  <td>{formatDate(row.PermitDate)}</td>
                  <td>{row.PermitNumber || '—'}</td>
                  <td>{row.Applicant || '—'}</td>
                  <td>{row.PermitAddress || '—'}</td>
                  <td>{row.PermitType || '—'}</td>
                  <td>{row.PermitStatus || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="pager">
        <button
          type="button"
          disabled={!pagination.hasPreviousPage || loading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>

        <div className="page-indicator">
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={pageNumber === page ? 'active-page' : ''}
              onClick={() => setPage(pageNumber)}
              disabled={loading}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!pagination.hasNextPage || loading}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </footer>

      <div className="summary">Showing {rows.length} of {pagination.total} permits</div>
    </div>
  );
}
