// frontend/app/favorites/page.tsx
'use client';

import Link from 'next/link';
import MovieGrid, { SlowLoadingNotice } from '../components/MovieGrid';
import { useFavorites } from '../hooks/useFavorites';
import { getErrorMessage } from '../lib/api';
import { favoriteToMovie } from '../types/movie';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/page.module.css';

export default function FavoritesPage() {
  const { favorites, isLoading, error, refetch } = useFavorites();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>My List</h1>
        {favorites && favorites.length > 0 && (
          <p className={styles.count}>
            {favorites.length} title{favorites.length !== 1 ? 's' : ''}
          </p>
        )}
      </header>

      {isLoading && (
        <>
          <SlowLoadingNotice />
          <MovieGrid isLoading />
        </>
      )}

      {error && (
        <div className={styles.state}>
          <h2>We couldn&apos;t load your list</h2>
          <p>{getErrorMessage(error)}</p>
          <button type="button" className={`${buttons.btn} ${buttons.primary}`} onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}

      {favorites && favorites.length === 0 && (
        <div className={styles.state}>
          <h2>Your list is empty</h2>
          <p>Add movies to your list to keep track of what you want to watch.</p>
          <Link href="/search" className={`${buttons.btn} ${buttons.accent}`}>
            Browse movies
          </Link>
        </div>
      )}

      {favorites && favorites.length > 0 && <MovieGrid movies={favorites.map(favoriteToMovie)} />}
    </div>
  );
}
