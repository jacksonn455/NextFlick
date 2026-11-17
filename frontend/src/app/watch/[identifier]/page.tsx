// frontend/app/watch/[identifier]/page.tsx
'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VideoPlayer from '../../components/VideoPlayer';
import EmbedPlayer from '../../components/EmbedPlayer';
import Poster from '../../components/Poster';
import { FreeMovieRow, toCardData } from '../../components/FreeMovieRow';
import { ExternalIcon } from '../../components/Icons';
import { useFreeCatalog, useFreeMovie } from '../../hooks/useFreeMovies';
import { useWatchEntry } from '../../hooks/useWatchHistory';
import { getErrorMessage } from '../../lib/api';
import {
  FreeMovieDetails,
  formatDuration,
  formatTimestamp,
  SOURCE_LABELS,
  watchUrl,
} from '../../types/freeMovie';
import buttons from '../../styles/buttons.module.css';
import styles from '../../styles/free.module.css';

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

function MoreFromSource({ movie }: { movie: FreeMovieDetails }) {
  const { data, isLoading } = useFreeCatalog({ source: movie.source }, 21);
  const items = useMemo(
    () => data?.movies.filter((m) => m.identifier !== movie.identifier).slice(0, 20).map(toCardData),
    [data, movie.identifier],
  );
  return (
    <div className={styles.moreRow}>
      <FreeMovieRow
        title={`More from ${SOURCE_LABELS[movie.source]}`}
        testId="more-from-source"
        items={items}
        isLoading={isLoading}
      />
    </div>
  );
}

function WatchContent() {
  const params = useParams<{ identifier: string }>();
  const identifier = params.identifier ? safeDecode(params.identifier) : undefined;
  const searchParams = useSearchParams();
  const { data: movie, isLoading, error } = useFreeMovie(identifier);
  const { data: entry } = useWatchEntry(identifier);
  // "?play=1" (Continue Watching, hero) opens the player right away
  const [isPlaying, setIsPlaying] = useState(searchParams.get('play') === '1');

  if (isLoading) {
    return (
      <div className={styles.watch} aria-busy="true" aria-label="Loading film">
        <div className={`${styles.player} ${styles.playerLoading}`} />
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className={styles.watch}>
        <div className={styles.state} role="alert" data-testid="free-movie-error">
          <h1>This movie isn&apos;t available</h1>
          <p>{getErrorMessage(error)}</p>
          <p>It may have been removed, restricted by its owner, or it is not free to watch.</p>
          <p>
            <Link href="/watch" className={`${buttons.btn} ${buttons.secondary}`}>
              Browse free movies
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const sourceLabel = SOURCE_LABELS[movie.source] ?? 'the source';
  // Progress is only tracked for the built-in player
  const resumeAt = movie.videoUrl && entry && !entry.completed && entry.position > 0 ? entry.position : 0;
  const duration = formatDuration(movie.durationSeconds);
  const canPlay = !!(movie.videoUrl || movie.embedUrl);

  return (
    <div className={styles.watch}>
      <Link href="/watch" className={styles.back}>
        ← Back to browsing
      </Link>

      {isPlaying && canPlay && (
        <div className={styles.playerWrap}>
          {movie.videoUrl ? <VideoPlayer movie={movie} startAt={resumeAt} /> : <EmbedPlayer movie={movie} />}
        </div>
      )}

      <div className={styles.details}>
        {!isPlaying && (
          <div className={styles.thumb}>
            <Poster src={movie.thumbnail} title={movie.title} eager />
          </div>
        )}

        <div className={isPlaying ? styles.detailsWide : undefined}>
          <h1 className={styles.title} data-testid="free-movie-title">
            {movie.title}
          </h1>
          <div className={styles.meta}>
            {movie.year && <span>{movie.year}</span>}
            {duration && <span>{duration}</span>}
            {movie.genres.length > 0 && <span>{movie.genres.slice(0, 3).join(', ')}</span>}
            <span className={styles.sourceTag} data-testid="free-movie-source">
              {sourceLabel}
            </span>
            {movie.freeToWatch ? (
              <span className={styles.licenseBadge}>Free to watch</span>
            ) : (
              <span className={styles.publicTag}>Publicly available · license not verified</span>
            )}
          </div>

          {!isPlaying && (
            <div className={styles.actions}>
              {canPlay ? (
                <button
                  type="button"
                  className={`${buttons.btn} ${buttons.primary}`}
                  onClick={() => setIsPlaying(true)}
                  data-testid="watch-now"
                >
                  ▶ {resumeAt ? `Resume from ${formatTimestamp(resumeAt)}` : 'Watch Now'}
                </button>
              ) : (
                <p role="status">No playable version is available right now.</p>
              )}
              <a
                className={`${buttons.btn} ${buttons.secondary}`}
                href={movie.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on {sourceLabel} <ExternalIcon size={16} />
              </a>
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

          {movie.alsoAvailableOn && movie.alsoAvailableOn.length > 0 && (
            <p className={styles.description}>
              <strong>Also on</strong>{' '}
              {movie.alsoAvailableOn.map((ref, i) => (
                <span key={ref.identifier}>
                  {i > 0 && ', '}
                  <Link href={watchUrl(ref.identifier)} className={styles.inlineLink}>
                    {SOURCE_LABELS[ref.source]}
                  </Link>
                </span>
              ))}
            </p>
          )}

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
              {!movie.licenseVerified && movie.license.type && ' (stated by the source, not verified per film)'}
            </p>
            <p>{movie.attribution}</p>
            {movie.rights && <p>Rights statement: {movie.rights}</p>}
            <p>
              <a href={movie.sourceUrl} target="_blank" rel="noopener noreferrer">
                View on {sourceLabel} <ExternalIcon size={14} />
              </a>
            </p>
          </section>
        </div>
      </div>

      <MoreFromSource movie={movie} />
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
