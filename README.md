## Documentation

Detailed documentation for each part of the project is located in their respective directories:

- **[Backend README](./backend/README.md)** - Contains information about

- **[Frontend README](./frontend/README.md)** - Contains information about

[video](https://youtu.be/-mGRLKJQuuk)  - Contains all information about project

  ![]()
  ![]()
  ![]()

## Hosting

The project is deployed in the cloud, with each part on its own platform:

| Part | Platform | URL |
|---|---|---|
| Frontend (Next.js) | [Vercel](https://vercel.com) | _coming soon_ |
| Backend API (NestJS) | [Render](https://render.com) | https://nextflick-o00k.onrender.com |
| API docs (Swagger) | Render | https://nextflick-o00k.onrender.com/api |

Supporting services: **MongoDB Atlas** (database), **Upstash Redis** (cache) and **OMDb API** (movie data).

> The backend runs on Render's free plan and sleeps after 15 minutes of inactivity, so the first request after that may take 30–50 seconds.

See [Deploy](#deploy) for how to set up both platforms.

## Quick Start

1. Clone the repository
2. Access the specific documentation for each part:
   - For backend: `cd backend && cat README.md`
   - For frontend: `cd frontend && cat README.md`
3. Follow the installation and execution instructions in each README

## Notes

Each module (backend and frontend) has its own README with detailed and specific instructions to facilitate project development and maintenance.

## Deploy

Requires **Node.js 22** (see `.nvmrc`). Backend and frontend live in the same repository and are deployed separately, each from its own root directory.

### Backend → Render

1. In Render, create a **Blueprint** from this repository (it reads [`render.yaml`](./render.yaml)), or a Web Service with Root Directory `backend`, build `npm ci --include=dev && npm run build` and start `npm run start:prod`.
2. Fill in the secret environment variables: `MONGO_URI`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `OMDB_API_KEY` and `CORS_ORIGIN` (the Vercel URL, e.g. `https://nextflick.vercel.app`).
3. In MongoDB Atlas → Network Access, allow `0.0.0.0/0` (Render has no static outbound IP on the free plan).
4. Health check: `GET /api` (Swagger docs).

### Frontend → Vercel

1. Import this repository in Vercel and set **Root Directory** to `frontend` (Next.js is detected automatically).
2. Add the environment variable `NEXT_PUBLIC_API_URL` with the Render URL (`https://nextflick-o00k.onrender.com`, no trailing slash).
3. `NEXT_PUBLIC_*` variables are embedded at build time — redeploy after changing them.
