// frontend/app/components/MovieDetailsModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useMovieDetails } from '../hooks/useMovies';
import { getErrorMessage, getPosterUrl } from '../lib/api';
import { Movie } from '../types/movie';
import FavoriteToggle from './FavoriteToggle';
import { CloseIcon, ExternalIcon, StarIcon } from './Icons';
import Poster from './Poster';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/modal.module.css';

interface MovieDetailsModalProps {
  movie: Movie;
  onClose: () => void;
}

export default function MovieDetailsModal({ movie, onClose }: MovieDetailsModalProps) {
  const { data: details, isLoading, error } = useMovieDetails(movie.imdbID);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock page scroll, close on Escape and move focus into the dialog while open
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  // Basic info from the card shows instantly; details fill in when loaded
  const current = details ?? movie;
  const backdrop = getPosterUrl(current.Poster, 1000);
  const meta = details ? [details.Year, details.Rated, details.Runtime].filter(Boolean) : [movie.Year];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon size={22} />
        </button>

        <div className={styles.header}>
          {backdrop && (
            <div className={styles.backdrop} style={{ backgroundImage: `url(${backdrop})` }} aria-hidden="true" />
          )}
          <div className={styles.headerShade} aria-hidden="true" />

          <div className={styles.headerContent}>
            <div className={styles.poster}>
              <Poster src={current.Poster} title={current.Title} width={600} eager />
            </div>

            <div className={styles.headline}>
              <h2 id="movie-modal-title" className={styles.title}>{current.Title}</h2>
              <div className={styles.meta}>
                {details?.imdbRating && (
                  <span className={styles.rating}>
                    <StarIcon size={16} /> {details.imdbRating}
                  </span>
                )}
                {meta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
                {current.Type && <span className={styles.badge}>{current.Type}</span>}
              </div>
              <div className={styles.actions}>
                <FavoriteToggle movie={movie} />
                <a
                  className={`${buttons.btn} ${buttons.secondary}`}
                  href={`https://www.imdb.com/title/${movie.imdbID}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  IMDb <ExternalIcon size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {isLoading && (
            <div className={styles.loading} aria-busy="true">
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
              <div className={`${styles.skeletonLine} ${styles.short}`} />
            </div>
          )}

          {error && <p className={styles.error}>{getErrorMessage(error)}</p>}

          {details && (
            <div className={styles.columns}>
              <p className={styles.plot}>{details.Plot ?? 'No synopsis available.'}</p>

              <dl className={styles.facts}>
                {[
                  ['Genre', details.Genre],
                  ['Director', details.Director],
                  ['Cast', details.Actors],
                  ['Released', details.Released],
                  ['Language', details.Language],
                  ['Country', details.Country],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className={styles.fact}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
