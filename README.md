# CareerTrack – Job Application Management System

npm-workspaces monorepo.

```
backend/   Express + TypeScript REST API (routes → controllers → services → repositories)
frontend/  React + Vite + Tailwind + shadcn/ui (feature-based)
```

## Run (Windows CMD)

```cmd
npm install
copy backend\.env.example backend\.env
npm run dev
```

- API:  http://localhost:5000/api/v1/health
- Web:  http://localhost:5173

## Scripts

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | API + web together               |
| `npm test`          | Backend tests (Vitest/Supertest) |
| `npm run typecheck` | Typecheck both workspaces        |
| `npm run build`     | Production build of both         |

## Database (Phase 2)

`docker compose up -d mysql`, or use a local MySQL 8 install and edit `DATABASE_URL` in `backend/.env`.
