// frontend/app/components/FreeMovieCard.tsx
import Link from 'next/link';
import { watchUrl } from '../types/freeMovie';
import Poster from './Poster';
import styles from '../styles/free.module.css';

export interface FreeMovieCardData {
  identifier: string;
  title: string;
  thumbnail?: string;
  year?: string | null;
  // 0..1, shown as a bar on Continue Watching cards
  progress?: number;
}

export default function FreeMovieCard({ identifier, title, thumbnail, year, progress }: FreeMovieCardData) {
  const isResuming = progress !== undefined;

  return (
    <Link
      href={watchUrl(identifier, isResuming)}
      className={styles.card}
      data-testid={isResuming ? 'continue-watching-card' : 'free-movie-card'}
      aria-label={`${isResuming ? 'Resume' : 'Watch'} ${title}${year ? ` (${year})` : ''}`}
    >
      <Poster src={thumbnail} title={title} />
      {!isResuming && <span className={styles.freeBadge}>Free</span>}
      <span className={styles.cardInfo} aria-hidden="true">
        <span className={styles.cardTitle}>{title}</span>
        {year && <span className={styles.cardMeta}>{year}</span>}
      </span>
      {isResuming && (
        <span className={styles.progressTrack} aria-hidden="true">
          <span className={styles.progressBar} style={{ width: `${Math.round(Math.min(progress, 1) * 100)}%` }} />
        </span>
      )}
    </Link>
  );
}
