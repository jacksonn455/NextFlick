// frontend/app/components/FreeMovieCard.tsx
import Link from 'next/link';
import { formatDuration, MovieSource, SOURCE_LABELS, SOURCE_SHORT_LABELS, watchUrl } from '../types/freeMovie';
import Poster from './Poster';
import styles from '../styles/free.module.css';

export interface FreeMovieCardData {
  identifier: string;
  title: string;
  thumbnail?: string;
  year?: string | null;
  source?: MovieSource;
  durationSeconds?: number | null;
  // Defaults to true: the catalog only lists free films unless asked otherwise
  freeToWatch?: boolean;
  // 0..1, shown as a bar on Continue Watching cards
  progress?: number;
}

export default function FreeMovieCard({
  identifier,
  title,
  thumbnail,
  year,
  source,
  durationSeconds,
  freeToWatch = true,
  progress,
}: FreeMovieCardData) {
  const isResuming = progress !== undefined;
  const duration = formatDuration(durationSeconds);
  const meta = [year, duration].filter(Boolean).join(' · ');
  const label = [
    `${isResuming ? 'Resume' : 'Watch'} ${title}`,
    year && `(${year})`,
    source && `on ${SOURCE_LABELS[source]}`,
    !isResuming && (freeToWatch ? '— free to watch' : '— publicly available, license not verified'),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link
      href={watchUrl(identifier, isResuming)}
      className={styles.card}
      data-testid={isResuming ? 'continue-watching-card' : 'free-movie-card'}
      aria-label={label}
    >
      <Poster src={thumbnail} title={title} />
      {!isResuming && (
        <span className={freeToWatch ? styles.freeBadge : styles.publicBadge} aria-hidden="true">
          {freeToWatch ? 'Free' : 'Public'}
        </span>
      )}
      {source && (
        <span className={styles.sourceBadge} aria-hidden="true">
          {SOURCE_SHORT_LABELS[source]}
        </span>
      )}
      <span className={styles.cardInfo} aria-hidden="true">
        <span className={styles.cardTitle}>{title}</span>
        {meta && <span className={styles.cardMeta}>{meta}</span>}
      </span>
      {isResuming && (
        <span className={styles.progressTrack} aria-hidden="true">
          <span className={styles.progressBar} style={{ width: `${Math.round(Math.min(progress, 1) * 100)}%` }} />
        </span>
      )}
    </Link>
  );
}
