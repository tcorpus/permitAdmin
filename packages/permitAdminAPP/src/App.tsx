import { useEffect, useMemo, useState, type FormEvent } from 'react';

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

type PermitType = 'open-burn' | 'campfire';

type PermitForm = {
  permitType: PermitType;
  permitPeriod: string;
  streetNumber: string;
  streetName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  requestedDate: string;
  permitStartTime: string;
  permitEndTime: string;
};

export function buildPermitApplication(form: PermitForm): Record<string, string | number> {
  const application: Record<string, string | number> = {
    permitType: form.permitType,
    permitPeriod: Number(form.permitPeriod),
    streetNumber: form.streetNumber.trim(),
    streetName: form.streetName.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    email: form.email.trim(),
    requestedDate: form.requestedDate,
  };

  if (form.permitType === 'campfire') {
    application.permitStartTime = Number(form.permitStartTime);
    application.permitEndTime = Number(form.permitEndTime);
  }

  return application;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyPermitForm(): PermitForm {
  return {
    permitType: 'open-burn',
    permitPeriod: '1',
    streetNumber: '',
    streetName: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    requestedDate: today(),
    permitStartTime: '12',
    permitEndTime: '15',
  };
}

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
  const [isNewPermitOpen, setIsNewPermitOpen] = useState<boolean>(false);
  const [permitForm, setPermitForm] = useState<PermitForm>(emptyPermitForm);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  const updateForm = (field: keyof PermitForm, value: string): void => {
    setPermitForm((current) => ({ ...current, [field]: value }));
  };

  const closeNewPermit = (): void => {
    if (!submitting) {
      setIsNewPermitOpen(false);
      setSubmitError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPermitApplication(permitForm)),
      });
      const payload = (await response.json()) as { error?: string; eligibility?: { responseMessage?: string }; permit?: Record<string, unknown> | null };
      if (!response.ok) throw new Error(payload.error || 'Unable to create permit');
      if (!payload.permit) {
        throw new Error(payload.eligibility?.responseMessage || 'Permit could not be created');
      }

      setPermitForm(emptyPermitForm());
      setIsNewPermitOpen(false);
      await fetchPermits();
    } catch (submitLoadError) {
      setSubmitError(submitLoadError instanceof Error ? submitLoadError.message : 'Unable to create permit');
    } finally {
      setSubmitting(false);
    }
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
          <button type="button" className="new-permit-button" onClick={() => setIsNewPermitOpen(true)}>
            <span aria-hidden="true">+</span> New permit
          </button>
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
{/*
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
*/}
        <button
          type="button"
          disabled={!pagination.hasNextPage || loading}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </footer>

      <div className="summary">Showing {rows.length} of {pagination.total} permits</div>

      {isNewPermitOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeNewPermit}>
          <section className="permit-modal" role="dialog" aria-modal="true" aria-labelledby="new-permit-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Permit application</p>
                <h2 id="new-permit-title">New permit</h2>
              </div>
              <button type="button" className="close-button" aria-label="Close new permit form" onClick={closeNewPermit}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Permit type
                  <select value={permitForm.permitType} onChange={(event) => updateForm('permitType', event.target.value)}>
                    <option value="open-burn">Open burn</option>
                    <option value="campfire">Campfire</option>
                  </select>
                </label>
                <label>
                  Permit period
                  <input type="number" min="1" value={permitForm.permitPeriod} onChange={(event) => updateForm('permitPeriod', event.target.value)} required />
                </label>
                <label>
                  First name
                  <input value={permitForm.firstName} onChange={(event) => updateForm('firstName', event.target.value)} required />
                </label>
                <label>
                  Last name
                  <input value={permitForm.lastName} onChange={(event) => updateForm('lastName', event.target.value)} required />
                </label>
                <label>
                  Email
                  <input type="email" value={permitForm.email} onChange={(event) => updateForm('email', event.target.value)} required />
                </label>
                <label>
                  Phone number
                  <input type="tel" value={permitForm.phoneNumber} onChange={(event) => updateForm('phoneNumber', event.target.value)} required />
                </label>
                <label>
                  Street number
                  <input value={permitForm.streetNumber} onChange={(event) => updateForm('streetNumber', event.target.value)} required />
                </label>
                <label>
                  Street name
                  <input value={permitForm.streetName} onChange={(event) => updateForm('streetName', event.target.value)} required />
                </label>
                <label>
                  Permit date
                  <input type="date" value={permitForm.requestedDate} onChange={(event) => updateForm('requestedDate', event.target.value)} required />
                </label>
                {permitForm.permitType === 'campfire' ? (
                  <>
                    <label>
                      Start time code
                      <input type="number" min="0" value={permitForm.permitStartTime} onChange={(event) => updateForm('permitStartTime', event.target.value)} required />
                    </label>
                    <label>
                      End time code
                      <input type="number" min="0" value={permitForm.permitEndTime} onChange={(event) => updateForm('permitEndTime', event.target.value)} required />
                    </label>
                  </>
                ) : null}
              </div>

              {submitError ? <div className="error-panel modal-error">{submitError}</div> : null}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeNewPermit} disabled={submitting}>Cancel</button>
                <button type="submit" className="submit-button" disabled={submitting}>{submitting ? 'Creating...' : 'Create permit'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
