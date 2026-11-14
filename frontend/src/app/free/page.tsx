// frontend/app/free/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from '../components/SearchBar';
import FreeMovieCard from '../components/FreeMovieCard';
import { MovieCardSkeleton } from '../components/MovieCard';
import { SlowLoadingNotice } from '../components/MovieGrid';
import { useFreeMovies } from '../hooks/useFreeMovies';
import { getErrorMessage } from '../lib/api';
import pageStyles from '../styles/page.module.css';
import styles from '../styles/free.module.css';

const DEBOUNCE_MS = 400;
const PAGE_SIZE = 40;

function FreeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Same URL-driven search as /search
  const query = searchParams.get('q') ?? '';
  const [input, setInput] = useState(query);
  const { data: movies, isLoading, error } = useFreeMovies(query, PAGE_SIZE);

  const updateUrl = (value: string) => {
    const trimmed = value.trim();
    router.replace(trimmed ? `/free?q=${encodeURIComponent(trimmed)}` : '/free', { scroll: false });
  };

  useEffect(() => {
    if (input.trim() === query) return;
    const timeout = setTimeout(() => updateUrl(input), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.header}>
        <h1 className={pageStyles.pageTitle}>Free to Watch</h1>
      </div>
      <p className={styles.intro}>
        Public domain feature films from the Internet Archive, free to stream. Each film shows its license and
        source.
      </p>

      <SearchBar
        value={input}
        onChange={setInput}
        onSubmit={() => updateUrl(input)}
        label="Search free movies"
        placeholder="Search public domain films…"
      />

      {error && (
        <div className={pageStyles.state} role="alert">
          <h2>Free movies are unavailable</h2>
          <p>{getErrorMessage(error)}</p>
        </div>
      )}

      {isLoading && (
        <>
          <SlowLoadingNotice />
          <div className={styles.grid} aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {movies && !isLoading && (
        movies.length === 0 ? (
          <div className={pageStyles.state}>
            <h2>No free movies for &quot;{query}&quot;</h2>
            <p>Try another title. Only public domain films are listed.</p>
          </div>
        ) : (
          <div className={styles.grid} data-testid="free-movies-grid">
            {movies.map((movie) => (
              <FreeMovieCard
                key={movie.identifier}
                identifier={movie.identifier}
                title={movie.title}
                thumbnail={movie.thumbnail}
                year={movie.year}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default function FreePage() {
  return (
    <Suspense fallback={<div className={pageStyles.page} />}>
      <FreeContent />
    </Suspense>
  );
}
