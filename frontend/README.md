# NextFlick - Frontend

The NextFlick web app: search movies and series, keep a My List per user and get recommendations from the backend's TensorFlow.js model. The design is inspired by streaming platforms (dark theme, hero banner, horizontal rows).

## Technologies Used

The frontend is intentionally small: Next.js + React for the UI, React Query for server state and Axios for HTTP. Everything else (styles, icons, modal, toasts, user dialog) is written in the project, with no UI or component library.

### Dependencies

| Library | Version | Used for |
| :------ | :------ | :------- |
| [Next.js](https://nextjs.org) | 16.4.4 | App Router, pages (`/`, `/search`, `/favorites`), `next/font` (Inter), `next/navigation`, `next/link` |
| [React](https://react.dev) / React DOM | 19.3.1 | UI components, context (`MovieModalContext`, `ToastContext`) |
| [@tanstack/react-query](https://tanstack.com/query) | ^5.90 | Fetching, caching and mutations for movies, favorites, users and recommendations (`src/app/hooks`) |
| [Axios](https://axios-http.com) | ^1.12 | HTTP client for the backend API (`src/app/lib/api.ts`), with a 60s timeout because the free Render backend may be waking up |

### Dev dependencies

| Tool | Version | Used for |
| :--- | :------ | :------- |
| TypeScript | ^5 | Static typing (`types/` holds the API response types) |
| ESLint + eslint-config-next | ^9 / 16.4.4 | Lint with the Next.js `core-web-vitals` and `typescript` rules (`npm run lint`, and fix on save in VS Code) |
| @types/node, @types/react, @types/react-dom | | Type definitions |
| Tailwind CSS + @tailwindcss/postcss | ^4 | Installed and wired in `postcss.config.mjs`, but **not used**: `globals.css` doesn't import Tailwind and no component uses its classes. Can be removed |

### Styling

- **CSS Modules** (`src/app/styles/*.module.css`) for component styles
- **Global CSS** (`src/app/globals.css`) with the design tokens as CSS variables (`--bg`, `--accent`, `--radius`...)
- CSS animations and transitions, disabled with `prefers-reduced-motion`
- Icons are inline SVG components (`components/Icons.tsx`); posters use a plain `<img>`, since OMDb posters come from several CDNs

## Prerequisites

- Node.js 22 (see `.nvmrc` in the repository root)
- npm
- The [backend](../backend/README.md) running, by default on `http://localhost:3000`

## Getting Started

```bash
cd frontend
npm install
cp .env.example .env.local   # then adjust if needed
npm run dev
```

The app runs on `http://localhost:3001`.

### Environment variables

| Variable | Default | Description |
| :------- | :------ | :---------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Backend API base URL |

### Scripts

| Script | Description |
| :----- | :---------- |
| `npm run dev` | Development server on port 3001 |
| `npm run build` | Production build |
| `npm start` | Serves the production build on port 3001 |
| `npm run lint` | ESLint |

## Project Structure

```
frontend/
├── public/                     # Static files
├── src/app/
│   ├── components/             # Navbar, Hero, MovieRow, MovieGrid, MovieCard, Poster,
│   │                           # MovieDetailsModal, FavoriteToggle, SearchBar,
│   │                           # UserSwitcher, NewUserDialog, RecommendationsSection, Icons
│   ├── context/                # MovieModalContext (details modal), ToastContext (notifications)
│   ├── hooks/                  # React Query hooks: useMovies, useFavorites, useUsers, useRecommendations
│   ├── lib/                    # api.ts (Axios client, error messages, poster URLs), user.ts (selected user)
│   ├── types/                  # movie.ts, user.ts, recommendation.ts
│   ├── styles/                 # CSS Modules
│   ├── search/page.tsx         # /search
│   ├── favorites/page.tsx      # /favorites (My List)
│   ├── page.tsx                # / (home)
│   ├── layout.tsx              # Root layout, Inter font, Navbar
│   ├── providers.tsx           # QueryClient, toasts and modal providers
│   ├── globals.css
│   └── icon.svg                # Favicon
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

## Features

### Home
- Featured title in the hero banner
- My List and catalog rows (e.g. superhero sagas)

### Movie Search
- Live search through the backend (`GET /movies/search`, OMDb data cached in Redis)
- Responsive grid, loading states and friendly error messages

### Movie Details
- Modal with rating, plot, genre, cast and more (`GET /movies/:imdbID`)

### My List (favorites)
- Add/remove titles; React Query keeps the lists in sync with the backend
- Saved in MongoDB per user

### Users
- User switcher in the navbar, with the users from `GET /users`
- "+" button to create a user, selected right away
- Each user has their own My List (`x-user-id` header)

### Recommendations
- "Find your next favorite" prompt below My List, with a **Recommend movies & series** button
- With 3 or more titles in My List, the "Recommended for you" row appears without a click and updates on every new favorite
- Each recommended title shows its match (the model's score), e.g. "92% match"
- While the model trains, popular titles are shown and the row refreshes until the personalized ones arrive

## Deploy

Deployed on [Vercel](https://vercel.com): https://nextflick-three.vercel.app (`NEXT_PUBLIC_API_URL` points to the Render backend).

## Author

<img src="https://avatars1.githubusercontent.com/u/46221221?s=460&u=0d161e390cdad66e925f3d52cece6c3e65a23eb2&v=4" width=115>

<sub>@jacksonn455</sub>
