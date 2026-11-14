Playwright-only setup (with CI)

Goal: Set up Playwright to test the NextFlick frontend deployed on Vercel:
https://nextflick-three.vercel.app

Context
- Frontend: Next.js on Vercel (https://nextflick-three.vercel.app)
- Backend API: NestJS on Render free tier (https://nextflick-o00k.onrender.com)
  - The backend sleeps when idle; the first request can take ~50s (cold start)
- The tests live at the repo root (package.json, playwright.config.ts, tests/), separate from frontend/ and backend/

What to include
- Install only Playwright test runner (no extra frameworks)
- Configure baseURL as https://nextflick-three.vercel.app and a reasonable timeout (at most 5 seconds)
  - The 5s default covers the static shell (navbar, page title, routing) served by Vercel
  - Tests that wait for API data (movie rows, search results, My List) must raise their own timeout
    with test.setTimeout(...) and per-assertion { timeout } because of the Render cold start
- Create a tests/ directory and a first spec using @playwright/test that checks the app shell:
  page title "NextFlick", the "Main" navigation with Home / Search / My List links, and navigation to /search
- CI: GitHub Actions workflow that installs and runs only Chromium

Local setup
1) Install dev dependency
	- npm i -D @playwright/test

2) Install only Chromium browser binaries (smaller and faster)
	- npx playwright install --with-deps chromium

GitHub Actions (Chromium only)
- Create .github/workflows/playwright.yml with a job that:
  - Checks out the repo
  - Sets up Node.js (version from .nvmrc)
  - Runs npm ci
  - Runs npx playwright install --with-deps chromium
  - Runs npm test
  - Uploads the HTML report as an artifact on failure
