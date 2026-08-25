import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import { getPermits } from './services/permitService.js';

dotenv.config();

export const app = express();
const port = Number(process.env.PORT || 3001);

export const queryValue = (value: unknown): string | number | null => {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return String(value);
};

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/permits', async (req: Request, res: Response) => {
  try {
    const result = await getPermits({
      systemId: queryValue(req.query.systemId),
      startDate: typeof req.query.startDate === 'string' ? req.query.startDate : null,
      endDate: typeof req.query.endDate === 'string' ? req.query.endDate : null,
      page: queryValue(req.query.page),
      pageSize: queryValue(req.query.pageSize),
      sortField: typeof req.query.sortField === 'string' ? req.query.sortField : null,
      sortDirection: typeof req.query.sortDirection === 'string' ? req.query.sortDirection : null,
    });

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching permits:', error);
    res.status(500).json({
      error: 'Failed to fetch permits',
      details: process.env.NODE_ENV === 'development' ? message : undefined,
    });
  }
});

export function startServer() {
  return app.listen(port, () => {
    console.log(`Permit Admin API listening on http://localhost:${port}`);
  });
}

const isMainModule = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMainModule) {
  startServer();
}
