// frontend/app/components/MovieCard.tsx
'use client';

import { useMovieModal } from '../context/MovieModalContext';
import { Movie } from '../types/movie';
import FavoriteToggle from './FavoriteToggle';
import Poster from './Poster';
import styles from '../styles/card.module.css';

interface MovieCardProps {
  movie: Movie;
  // Short label on the poster, e.g. "92% match"
  badge?: string;
}

export default function MovieCard({ movie, badge }: MovieCardProps) {
  const { openMovie } = useMovieModal();

  return (
    <div className={styles.card}>
      <button
        type="button"
        className={styles.posterButton}
        onClick={() => openMovie(movie)}
        aria-label={`More info about ${movie.Title} (${movie.Year})`}
      >
        <Poster src={movie.Poster} title={movie.Title} />
        {badge && <span className={styles.match}>{badge}</span>}
        <span className={styles.overlay} aria-hidden="true">
          <span className={styles.title}>{movie.Title}</span>
          <span className={styles.meta}>
            {movie.Year}
            {movie.Type && <span className={styles.badge}>{movie.Type}</span>}
          </span>
        </span>
      </button>
      <FavoriteToggle movie={movie} variant="icon" className={styles.favorite} />
    </div>
  );
}

export function MovieCardSkeleton() {
  return <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true" />;
}
