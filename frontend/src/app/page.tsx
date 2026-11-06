// frontend/app/page.tsx
'use client';

import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import RecommendationsSection from './components/RecommendationsSection';
import { useFavorites } from './hooks/useFavorites';
import { useMovies } from './hooks/useMovies';
import { favoriteToMovie } from './types/movie';
import styles from './styles/home.module.css';

const FEATURED_IMDB_ID = 'tt0468569'; // The Dark Knight

// The API only offers search, so each row is a curated search term (cached by the backend)
const CATALOG_ROWS = [
  { title: 'Superhero Sagas', query: 'avengers' },
  { title: 'The Dark Knight Collection', query: 'batman' },
  { title: 'A Galaxy Far, Far Away', query: 'star wars' },
  { title: 'Wizarding World', query: 'harry potter' },
  { title: 'Animated Adventures', query: 'toy story' },
  { title: 'Mind-Bending Sci-Fi', query: 'matrix' },
  { title: 'Middle-earth', query: 'lord of the rings' },
];

function CatalogRow({ title, query }: { title: string; query: string }) {
  const { data: movies, isLoading } = useMovies(query);
  const playable = movies?.filter((movie) => movie.Type !== 'game');

  return <MovieRow title={title} movies={playable} isLoading={isLoading} />;
}

function MyListRow() {
  const { favorites } = useFavorites();
  return <MovieRow title="My List" movies={favorites?.map(favoriteToMovie)} />;
}

export default function Home() {
  return (
    <>
      <Hero imdbID={FEATURED_IMDB_ID} />
      <div className={styles.rows}>
        <MyListRow />
        <RecommendationsSection />
        {CATALOG_ROWS.map((row) => (
          <CatalogRow key={row.query} {...row} />
        ))}
      </div>
    </>
  );
}
