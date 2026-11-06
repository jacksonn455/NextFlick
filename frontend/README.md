# NextFlick - Frontend

A modern movie search and favorites management application, built with Next.js 14+ and React, featuring a design inspired by streaming platforms like Netflix, HBO Max, and Amazon Prime.

## Technologies Used

### Core
- **Next.js 14+** - React framework with App Router
- **React 18+** - JavaScript library for UI
- **TypeScript** - Typed superset of JavaScript

### State Management & Data Fetching
- **@tanstack/react-query** (v5) - Server-side state management and caching
- **Axios** - HTTP client for API requests

### Navigation
- **next/navigation** - Next.js 14 routing system
- **next/link** - Optimized page navigation

### Styling
- **CSS Modules** - Component-scoped styles
- **CSS Animations** - Custom animations and transitions
- **Glassmorphism** - Modern glass/blur effects

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:3000`

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd frontend
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure environment variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Run the project
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3001`

## Project Structure

```
frontend/
├── app/
│   ├── components/          
│   │   ├── Header.tsx
│   │   ├── SearchBar.tsx
│   │   ├── MovieCard.tsx
│   │   
│   ├── hooks/              
│   │   └── useFavorites.ts
│   ├── types/              
│   │   └── movie.ts
│   ├── styles/             
│   │   ├── search.module.css
│   │   ├── favorites.module.css
│   │   └── globals.css
│   ├── search/             
│   │   └── page.tsx
│   ├── favorites/          
│   │   └── page.tsx
│   ├── layout.tsx         
│   └── page.tsx            
├── public/                
├── .env.local            
├── next.config.js        
├── tsconfig.json         
└── package.json          
```

## Features

### Movie Search
- Integrated search with OMDb API
- Modern interface with visual effects
- Responsive grid results
- Loading states and error handling

### Favorites System
- Add/remove movies from favorites
- Real-time synchronization with backend
- Data persistence in MongoDB
- Intelligent caching with React Query

### Users
- User switcher in the navbar, with the users from `GET /users`
- "+" button to create a user, selected right away
- Each user has their own My List (`x-user-id` header)

### Recommendations
- "Find your next favorite" prompt below My List, with a **Recommend movies & series** button
- With 3 or more titles in My List, the "Recommended for you" row appears without a click and updates on every new favorite
- Each recommended title shows its match (the model's score), e.g. "92% match"
- While the model trains, popular titles are shown and the row refreshes until the personalized ones arrive

### Modern Design
- Glassmorphism and backdrop blur
- Animated gradients
- Smooth transitions
- Responsive design (mobile-first)
- Support for prefers-reduced-motion
- Support for high contrast mode


## Author

<img src="https://avatars1.githubusercontent.com/u/46221221?s=460&u=0d161e390cdad66e925f3d52cece6c3e65a23eb2&v=4" width=115>  

<sub>@jacksonn455</sub>

---
