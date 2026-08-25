# Permit Admin App

The app is a React and Vite front end for browsing burn permits returned by the
Permit Admin API.

## User interface

The main screen presents permits in a responsive table with:

- Permit date, number, applicant, address, type, and status columns
- Column sorting with ascending and descending directions
- Page-size choices of `20`, `50`, `100`, `200`, and `500`
- Pagination controls and a result-count summary
- Loading, empty, and API error states

Dates are formatted for the user's locale, and missing values are displayed as an
em dash.

## Implementation

- `src/App.tsx` owns the table state, API request lifecycle, sorting controls, and pagination.
- `src/index.css` provides the table layout, responsive behavior, and loading/error presentation.
- `src/main.tsx` mounts the React application.
- `vite.config.ts` configures the development server and proxies `/api` to
  `http://localhost:3001`.
- `tests/App.test.js` tests date formatting, query serialization, page generation,
  and sort toggling.

The client sends `page`, `pageSize`, `sortField`, and `sortDirection` with each
permit request. The API's pagination response determines the available page buttons
and whether Previous or Next is enabled.

## Commands

Run from the repository root or this package directory:

```bash
npm run dev      # start Vite on port 5173
npm run build    # create the production build
npm test         # run app tests
npm run preview  # preview the production build on port 4173
```

The app expects the API to be running at `http://localhost:3001` during development.
