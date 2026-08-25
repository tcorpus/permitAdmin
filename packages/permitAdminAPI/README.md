# Permit Admin API

The API is a TypeScript Express service that exposes permit data from SQL Server
to the Permit Admin app.

## Responsibilities

- Starts an Express server on port `3001` by default.
- Enables CORS and JSON request handling.
- Provides `GET /health` for a lightweight status check.
- Provides `GET /api/permits` for filtered, sorted, paginated permits.
- Calls the existing `dbo.colsp_ListPermits` stored procedure through `mssql`.

## Configuration

Copy `.env.example` to `.env` and set the database connection values:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | HTTP port for the API |
| `DB_HOST` | `localhost` | SQL Server host |
| `DB_PORT` | `1433` | SQL Server port |
| `DB_NAME` | none | Database name |
| `DB_USER` | none | Database user |
| `DB_PASSWORD` | none | Database password |
| `DB_ENCRYPT` | `true` | Enable encrypted SQL connections |
| `DB_TRUST_SERVER_CERTIFICATE` | `true` | Trust the SQL Server certificate |

The database must provide `dbo.colsp_ListPermits` with `systemId`, `startDate`,
and `endDate` parameters.

## Implementation

- `server.ts` owns Express setup, request normalization, routes, and server startup.
- `config/db.ts` builds the `mssql` connection configuration and exposes the SQL client.
- `services/permitService.ts` executes the stored procedure, maps nullable database fields,
  validates query values, sorts rows, and calculates pagination metadata.
- `tests/` covers query normalization, database defaults, service behavior, and the health route.

Sorting is restricted to the known permit fields and defaults to `PermitDate` descending.
Invalid page sizes fall back to `20`; requested pages are clamped to the available range.

## Commands

Run from the repository root or this package directory:

```bash
npm run dev       # watch and run with tsx
npm run build     # compile TypeScript to dist/
npm test          # run API tests
npm start         # run the compiled server
```

## Endpoint example

```text
GET /api/permits?page=1&pageSize=20&sortField=PermitDate&sortDirection=desc
```

The response contains `data`, `pagination`, and the normalized `sort` settings.
