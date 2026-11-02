// frontend/app/components/Hero.tsx
'use client';

import { useMovieModal } from '../context/MovieModalContext';
import { useMovieDetails } from '../hooks/useMovies';
import { getPosterUrl } from '../lib/api';
import FavoriteToggle from './FavoriteToggle';
import { InfoIcon, StarIcon } from './Icons';
import Poster from './Poster';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/hero.module.css';

interface HeroProps {
  imdbID: string;
}

export default function Hero({ imdbID }: HeroProps) {
  const { data: movie, isLoading, isError } = useMovieDetails(imdbID);
  const { openMovie } = useMovieModal();

  if (isError) {
    return <div className={styles.fallback} />;
  }

  if (isLoading || !movie) {
    return (
      <section className={styles.hero} aria-busy="true" aria-label="Loading featured title">
        <div className={styles.content}>
          <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      </section>
    );
  }

  const backdrop = getPosterUrl(movie.Poster, 1200);
  const meta = [movie.Year, movie.Rated, movie.Runtime].filter(Boolean);

  return (
    <section className={styles.hero} aria-label={`Featured: ${movie.Title}`}>
      {backdrop && (
        <div className={styles.backdrop} style={{ backgroundImage: `url(${backdrop})` }} aria-hidden="true" />
      )}
      <div className={styles.shade} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.content}>
          <span className={styles.eyebrow}>Featured</span>
          <h1 className={styles.title}>{movie.Title}</h1>

          <div className={styles.meta}>
            {movie.imdbRating && (
              <span className={styles.rating}>
                <StarIcon size={16} /> {movie.imdbRating}
              </span>
            )}
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          {movie.Genre && <p className={styles.genre}>{movie.Genre.split(', ').join(' • ')}</p>}
          {movie.Plot && <p className={styles.plot}>{movie.Plot}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={`${buttons.btn} ${buttons.primary}`}
              onClick={() => openMovie(movie)}
            >
              <InfoIcon size={20} /> More Info
            </button>
            <FavoriteToggle movie={movie} />
          </div>
        </div>

        <div className={styles.poster}>
          <Poster src={movie.Poster} title={movie.Title} width={600} eager />
        </div>
      </div>
    </section>
  );
}
