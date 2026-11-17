// frontend/app/components/WatchHero.tsx
import Link from 'next/link';
import { FreeMovie, formatDuration, SOURCE_LABELS, watchUrl } from '../types/freeMovie';
import Poster from './Poster';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/watch.module.css';

interface WatchHeroProps {
  movie?: FreeMovie;
  isLoading?: boolean;
}

// Featured free film at the top of /watch
export default function WatchHero({ movie, isLoading = false }: WatchHeroProps) {
  if (isLoading || !movie) {
    return (
      <section className={styles.hero} aria-busy={isLoading} aria-label="Loading featured film">
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
            <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
          </div>
        </div>
      </section>
    );
  }

  const duration = formatDuration(movie.durationSeconds);
  const meta = [movie.year, duration, movie.genres.slice(0, 3).join(', ')].filter(Boolean);

  return (
    <section className={styles.hero} aria-label={`Featured: ${movie.title}`} data-testid="watch-hero">
      {movie.thumbnail && (
        <div
          className={styles.heroBackdrop}
          style={{ backgroundImage: `url(${JSON.stringify(movie.thumbnail)})` }}
          aria-hidden="true"
        />
      )}
      <div className={styles.heroShade} aria-hidden="true" />

      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Featured · Free to watch</span>
          <h2 className={styles.heroTitle}>{movie.title}</h2>
          <div className={styles.heroMeta}>
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <span className={styles.sourceTag}>{SOURCE_LABELS[movie.source]}</span>
            {movie.freeToWatch && <span className={styles.freeTag}>Free</span>}
          </div>
          {movie.description && <p className={styles.heroPlot}>{movie.description}</p>}
          <div className={styles.heroActions}>
            <Link
              href={watchUrl(movie.identifier, true)}
              className={`${buttons.btn} ${buttons.primary}`}
              data-testid="hero-watch-now"
            >
              ▶ Watch Now
            </Link>
            <Link href={watchUrl(movie.identifier)} className={`${buttons.btn} ${buttons.secondary}`}>
              More Info
            </Link>
          </div>
        </div>

        <div className={styles.heroArt}>
          <Poster src={movie.thumbnail} title={movie.title} eager />
        </div>
      </div>
    </section>
  );
}
