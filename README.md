# Permit Admin App

This workspace contains a small JavaScript stack for viewing permits in a searchable, sortable, paged table:

- API: `packages/permitAdminAPI`
- Front end: `packages/permitAdminAPP`

## Prerequisites

- Node.js 18+
- A SQL Server instance with the `dbo.colsp_ListPermits` stored procedure and related tables available.

## Setup

1. Install dependencies from the workspace root:
   ```bash
   npm install
   ```
2. Copy the API environment template and update values for your database:
   ```bash
   copy packages\permitAdminAPI\.env.example packages\permitAdminAPI\.env
   ```
3. Start both applications:
   ```bash
   npm run dev
   ```

The API runs on `http://localhost:3001` and the React app runs on `http://localhost:5173`.

## API contract

`GET /api/permits`

Query params:
- `systemId` (optional integer)
- `startDate` (optional ISO date, e.g. `2024-01-01`)
- `endDate` (optional ISO date)
- `page` (default `1`)
- `pageSize` (default `20`, allowed values: `20`, `50`, `100`, `200`, `500`)
- `sortField` (default `PermitDate`)
- `sortDirection` (default `desc`)

Example:
```bash
curl "http://localhost:3001/api/permits?page=1&pageSize=20&sortField=PermitDate&sortDirection=desc"
```

## Notes

The API calls the existing SQL Server stored procedure `dbo.colsp_ListPermits`, then performs the final paging and sorting in JavaScript after retrieving the result set. This keeps the DAL explicit and avoids ORMs such as Prisma.
