// frontend/app/components/MovieGrid.tsx
import { Movie } from '../types/movie';
import MovieCard, { MovieCardSkeleton } from './MovieCard';
import styles from '../styles/page.module.css';

interface MovieGridProps {
  movies?: Movie[];
  isLoading?: boolean;
}

const SKELETON_COUNT = 12;

export default function MovieGrid({ movies, isLoading = false }: MovieGridProps) {
  return (
    <div className={styles.grid} aria-busy={isLoading}>
      {isLoading
        ? Array.from({ length: SKELETON_COUNT }, (_, i) => <MovieCardSkeleton key={i} />)
        : movies?.map((movie) => <MovieCard key={movie.imdbID} movie={movie} />)}
    </div>
  );
}

// Appears only if loading takes a while, which usually means the backend is cold-starting
export function SlowLoadingNotice() {
  return (
    <p className={styles.slowNotice} role="status">
      Waking up the server, this can take up to a minute on the first visit…
    </p>
  );
}
