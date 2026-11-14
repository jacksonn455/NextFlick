// frontend/app/watch/[identifier]/page.tsx
'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VideoPlayer from '../../components/VideoPlayer';
import Poster from '../../components/Poster';
import { ExternalIcon } from '../../components/Icons';
import { useFreeMovie } from '../../hooks/useFreeMovies';
import { useWatchEntry } from '../../hooks/useWatchHistory';
import { getErrorMessage } from '../../lib/api';
import { formatDuration, formatTimestamp } from '../../types/freeMovie';
import buttons from '../../styles/buttons.module.css';
import styles from '../../styles/free.module.css';

function WatchContent() {
  const { identifier } = useParams<{ identifier: string }>();
  const searchParams = useSearchParams();
  const { data: movie, isLoading, error } = useFreeMovie(identifier);
  const { data: entry } = useWatchEntry(identifier);
  // "?play=1" (from Continue Watching) opens the player right away
  const [isPlaying, setIsPlaying] = useState(searchParams.get('play') === '1');

  if (isLoading) {
    return (
      <div className={styles.watch} aria-busy="true">
        <div className={styles.state}>Loading…</div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className={styles.watch}>
        <div className={styles.state} role="alert" data-testid="free-movie-error">
          <h1>This movie isn&apos;t available</h1>
          <p>{getErrorMessage(error)}</p>
          <p>
            <Link href="/free" className={styles.back}>
              Browse free movies
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const resumeAt = entry && !entry.completed && entry.position > 0 ? entry.position : 0;
  const duration = formatDuration(movie.durationSeconds);

  return (
    <div className={styles.watch}>
      <Link href="/free" className={styles.back}>
        ← Free to Watch
      </Link>

      {isPlaying && <VideoPlayer movie={movie} startAt={resumeAt} />}

      <div className={styles.details}>
        <div className={styles.thumb}>
          <Poster src={movie.thumbnail} title={movie.title} eager />
        </div>

        <div>
          <h1 className={styles.title} data-testid="free-movie-title">
            {movie.title}
          </h1>
          <div className={styles.meta}>
            {movie.year && <span>{movie.year}</span>}
            {duration && <span>{duration}</span>}
            <span className={styles.licenseBadge}>{movie.license.label}</span>
          </div>

          {!isPlaying && (
            <div className={styles.actions}>
              <button
                type="button"
                className={`${buttons.btn} ${buttons.primary}`}
                onClick={() => setIsPlaying(true)}
                data-testid="watch-now"
              >
                ▶ {resumeAt ? `Resume from ${formatTimestamp(resumeAt)}` : 'Watch Now'}
              </button>
            </div>
          )}

          {movie.creator && (
            <p className={styles.description}>
              <strong>By</strong> {movie.creator}
            </p>
          )}
          <p className={styles.description} data-testid="free-movie-description">
            {movie.description ?? 'No synopsis available.'}
          </p>

          <section className={styles.license} aria-labelledby="license-title" data-testid="license-info">
            <h2 id="license-title">License &amp; attribution</h2>
            <p>
              License:{' '}
              {movie.license.url ? (
                <a href={movie.license.url} target="_blank" rel="noopener noreferrer">
                  {movie.license.label}
                </a>
              ) : (
                movie.license.label
              )}
            </p>
            <p>{movie.attribution}</p>
            {movie.rights && <p>Rights statement: {movie.rights}</p>}
            <p>
              <a href={movie.sourceUrl} target="_blank" rel="noopener noreferrer">
                View on the Internet Archive <ExternalIcon size={14} />
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className={styles.watch} />}>
      <WatchContent />
    </Suspense>
  );
}
