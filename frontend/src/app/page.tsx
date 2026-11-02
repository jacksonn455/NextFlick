import Link from 'next/link';
import styles from '../app/styles/home.module.css';

export default function Home() {
  return (
    <div className={styles['movie-search-container']}>
      <div className={styles['movie-search-hero']}>
        <h1 className={styles['movie-search-title']}>🎬 NextFlick</h1>
        <p className={styles['movie-search-subtitle']}>
          Discover your favorite movies and build your personal collection
        </p>
        <div className={styles['movie-search-actions']}>
          <Link
            href="/search"
            className={styles['btn-primary']}
          >
            Search Movies
          </Link>
          <Link
            href="/favorites"
            className={styles['btn-secondary']}
          >
            View Favorites
          </Link>
        </div>
      </div>
    </div>
  );
}