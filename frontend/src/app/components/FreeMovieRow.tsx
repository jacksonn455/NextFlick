// frontend/app/components/FreeMovieRow.tsx
'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useFreeMovies } from '../hooks/useFreeMovies';
import { useContinueWatching } from '../hooks/useWatchHistory';
import { FreeMovie } from '../types/freeMovie';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import FreeMovieCard, { FreeMovieCardData } from './FreeMovieCard';
import rowStyles from '../styles/row.module.css';
import styles from '../styles/free.module.css';

interface FreeMovieRowProps {
  title: string;
  testId: string;
  items?: FreeMovieCardData[];
  isLoading?: boolean;
  subtitle?: React.ReactNode;
}

const SKELETON_COUNT = 6;

export const toCardData = (movie: FreeMovie): FreeMovieCardData => ({
  identifier: movie.identifier,
  title: movie.title,
  thumbnail: movie.thumbnail,
  year: movie.year,
  source: movie.source,
  durationSeconds: movie.durationSeconds,
  freeToWatch: movie.freeToWatch,
});

// Same layout as MovieRow, with landscape cards that link to the watch page
export function FreeMovieRow({ title, testId, items, isLoading = false, subtitle }: FreeMovieRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className={rowStyles.row} aria-label={title} data-testid={testId}>
      <h2 className={rowStyles.title}>{title}</h2>
      {subtitle && <p className={rowStyles.subtitle}>{subtitle}</p>}
      <div className={rowStyles.viewport}>
        <button
          type="button"
          className={`${rowStyles.arrow} ${rowStyles.arrowLeft}`}
          onClick={() => scroll(-1)}
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeftIcon size={32} />
        </button>

        <div className={rowStyles.track} ref={trackRef} aria-busy={isLoading}>
          {isLoading
            ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <div key={i} className={styles.item}>
                  <div className={styles.cardSkeleton} />
                </div>
              ))
            : items!.map((item) => (
                <div key={item.identifier} className={styles.item}>
                  <FreeMovieCard {...item} />
                </div>
              ))}
        </div>

        <button
          type="button"
          className={`${rowStyles.arrow} ${rowStyles.arrowRight}`}
          onClick={() => scroll(1)}
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRightIcon size={32} />
        </button>
      </div>
    </section>
  );
}

export function FreeToWatchRow() {
  const { data, isLoading, error } = useFreeMovies();

  // The rest of the home page keeps working if the free sources are down
  if (error) {
    return (
      <section className={rowStyles.row} aria-label="Free to Watch" data-testid="free-to-watch">
        <h2 className={rowStyles.title}>Free to Watch</h2>
        <p className={styles.rowError} role="status">
          Free movies are unavailable right now. Please try again later.
        </p>
      </section>
    );
  }

  return (
    <FreeMovieRow
      title="Free to Watch"
      testId="free-to-watch"
      isLoading={isLoading}
      subtitle={
        <>
          Public domain and openly licensed films from the Internet Archive, the Library of Congress, PeerTube and
          more. <Link href="/watch">See all</Link>
        </>
      }
      items={data?.map(toCardData)}
    />
  );
}

export function ContinueWatchingRow() {
  const { data } = useContinueWatching();

  return (
    <FreeMovieRow
      title="Continue Watching"
      testId="continue-watching"
      items={data?.map((entry) => ({
        identifier: entry.identifier,
        title: entry.title,
        thumbnail: entry.thumbnail,
        progress: entry.duration > 0 ? entry.position / entry.duration : 0,
      }))}
    />
  );
}
