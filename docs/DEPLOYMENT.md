# Deployment Guide

HelpDesk Pro is split into three independently deployable pieces:

- **Frontend** (`apps/web`) - static build, deployed to **GitHub Pages** via `.github/workflows/deploy.yml`.
- **API** (`apps/api`) - a Node/Express server, deployed to any Node host (Render, Railway, Fly.io, Azure App Service, AWS).
- **Database** - PostgreSQL, provisioned by whichever host you pick (or a separate managed Postgres like Neon/Supabase).

GitHub Pages **cannot** run the API or database - it only serves static
files. The frontend and backend are deployed separately and connected via
the `VITE_API_BASE_URL` build-time environment variable.

## 1. Deploying the frontend (GitHub Pages)

Already automated: `.github/workflows/deploy.yml` runs on every push to
`main`, builds `apps/web`, and publishes it to GitHub Pages.

One-time setup in the GitHub repository:

1. Go to **Settings -> Pages** and set **Source** to **GitHub Actions**.
2. (Optional, once you have a deployed API) Go to **Settings -> Secrets and
   variables -> Actions -> Variables** and add a repository variable
   `VITE_API_BASE_URL` set to `https://your-api-host.example.com/api`. The
   workflow reads this at build time; without it, the deployed frontend
   points at `http://localhost:4000/api` and API calls will fail from the
   live site until you set it.
3. Push to `main` (or run the workflow manually from the Actions tab). The
   deployed URL appears in the workflow's summary and under
   **Settings -> Pages**.

## 2. Deploying the API

The API is a standard Node/Express app (`apps/api`) with a `Dockerfile`
(`apps/api/Dockerfile`), so it deploys to any container-friendly host.
Steps below use Render as a concrete example; Railway and Fly.io follow the
same shape.

### Render

1. Create a **PostgreSQL** instance in Render (or use any managed Postgres
   - Neon and Supabase both have generous free tiers). Copy its connection
   string.
2. Create a new **Web Service** in Render, pointing at this GitHub repo.
   - **Root directory**: repo root (the Dockerfile handles the monorepo build).
   - **Dockerfile path**: `apps/api/Dockerfile`
   - **Docker build context**: `.` (repo root)
3. Set environment variables on the Render service (see `.env.example` for
   the full list). At minimum:
   ```
   NODE_ENV=production
   DATABASE_URL=<your Postgres connection string>
   CORS_ORIGIN=https://<your-github-username>.github.io
   JWT_ACCESS_SECRET=<generate a long random string>
   JWT_REFRESH_SECRET=<a different long random string>
   STORAGE_DRIVER=local
   EMAIL_PROVIDER=mock
   ```
   For file uploads to survive restarts/redeploys, attach a persistent disk
   mounted at the path in `LOCAL_UPLOAD_DIR`, or switch to
   `STORAGE_DRIVER=s3` with an S3-compatible bucket (see `.env.example`).
4. After the first deploy, run migrations and seed data once, either via
   Render's shell (**Shell** tab on the service) or locally against the
   production `DATABASE_URL`:
   ```bash
   npm install
   npm run db:generate --workspace=packages/database
   npm run db:migrate:deploy --workspace=packages/database
   npm run db:seed --workspace=packages/database   # optional demo data
   ```
5. Note the service's public URL (e.g. `https://helpdesk-api.onrender.com`).
   Set it as `VITE_API_BASE_URL=https://helpdesk-api.onrender.com/api` in
   the GitHub repository variable described above, then re-run the Pages
   deploy workflow so the frontend points at it.

### Railway / Fly.io

Same shape: provision a Postgres add-on/app, deploy `apps/api/Dockerfile`
with the same environment variables, run
`npm run db:migrate:deploy --workspace=packages/database` once against the
production database, then point `VITE_API_BASE_URL` at the deployed URL.

## 3. Local production-like run (Docker Compose)

For testing the full stack together without any cloud accounts:

```bash
docker compose up --build
```

This starts PostgreSQL, the API (`:4000`), and the web app behind nginx
(`:5173`). After the containers are healthy, run migrations and seed data
once:

```bash
docker compose exec api npm run db:migrate:deploy --workspace=packages/database
docker compose exec api npm run db:seed --workspace=packages/database
```

## 4. Rolling back / re-deploying

- Frontend: re-run the `Deploy Frontend to GitHub Pages` workflow, or push
  a new commit to `main`.
- API: redeploy on your host (most hosts redeploy automatically on push to
  the connected branch).
- Database: `npm run db:migrate:deploy --workspace=packages/database`
  applies new migrations without dropping data. Never run
  `db push --accept-data-loss` against production.
