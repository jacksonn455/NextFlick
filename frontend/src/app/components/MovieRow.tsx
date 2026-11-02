// frontend/app/components/MovieRow.tsx
'use client';

import { useRef } from 'react';
import { Movie } from '../types/movie';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import MovieCard, { MovieCardSkeleton } from './MovieCard';
import styles from '../styles/row.module.css';

interface MovieRowProps {
  title: string;
  movies?: Movie[];
  isLoading?: boolean;
}

const SKELETON_COUNT = 8;

export default function MovieRow({ title, movies, isLoading = false }: MovieRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!isLoading && (!movies || movies.length === 0)) return null;

  return (
    <section className={styles.row} aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.viewport}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => scroll(-1)}
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeftIcon size={32} />
        </button>

        <div className={styles.track} ref={trackRef}>
          {isLoading
            ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <div key={i} className={styles.item}>
                  <MovieCardSkeleton />
                </div>
              ))
            : movies!.map((movie) => (
                <div key={movie.imdbID} className={styles.item}>
                  <MovieCard movie={movie} />
                </div>
              ))}
        </div>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => scroll(1)}
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRightIcon size={32} />
        </button>
      </div>
    </section>
  );
}
