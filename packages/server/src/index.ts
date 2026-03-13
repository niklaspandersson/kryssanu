import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import birdsRoutes from './routes/birds.js';
import observationsRoutes from './routes/observations.js';
import eventsRoutes from './routes/events.js';
import statsRoutes from './routes/stats.js';
import usersRoutes from './routes/users.js';
import feedRoutes from './routes/feed.js';
import type { Request, Response, NextFunction } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/birds', birdsRoutes);
app.use('/api/observations', observationsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/feed', feedRoutes);

// Serve static frontend assets in production
const clientDistPath =
  process.env.CLIENT_DIST_PATH || path.resolve(__dirname, '../../client/dist');

// Hashed assets get long-term caching
app.use(
  '/assets',
  express.static(path.join(clientDistPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
  })
);

// Other static files (index.html, favicon, etc.) — no cache
app.use(express.static(clientDistPath, { maxAge: 0 }));

// SPA catch-all: serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global error handler — catches errors forwarded by asyncHandler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
