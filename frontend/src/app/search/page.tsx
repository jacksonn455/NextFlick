// frontend/app/search/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from '../components/SearchBar';
import MovieGrid, { SlowLoadingNotice } from '../components/MovieGrid';
import { MIN_QUERY_LENGTH, useMovies } from '../hooks/useMovies';
import { getErrorMessage } from '../lib/api';
import styles from '../styles/page.module.css';

const DEBOUNCE_MS = 400;
const SUGGESTIONS = ['Batman', 'Star Wars', 'Harry Potter', 'Matrix', 'Toy Story', 'Jurassic Park', 'Spider-Man', 'Inception'];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the source of truth, so results survive refresh, back navigation and sharing
  const query = searchParams.get('q') ?? '';
  const [input, setInput] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const { data: movies, isLoading, error } = useMovies(query);

  // Keep the input in sync when the URL changes from outside (back/forward navigation)
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    if (query !== input.trim()) setInput(query);
  }

  const updateUrl = (value: string) => {
    const trimmed = value.trim();
    router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search', { scroll: false });
  };

  // Search as the user types, after a short pause
  useEffect(() => {
    if (input.trim() === query) return;
    const timeout = setTimeout(() => updateUrl(input), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const pickSuggestion = (term: string) => {
    setInput(term);
    updateUrl(term);
  };

  const isTooShort = query.length > 0 && query.length < MIN_QUERY_LENGTH;

  return (
    <div className={styles.page}>
      <SearchBar value={input} onChange={setInput} onSubmit={() => updateUrl(input)} />

      {!query && (
        <div className={styles.suggestions}>
          <h2 className={styles.sectionTitle}>Popular searches</h2>
          <div className={styles.chips}>
            {SUGGESTIONS.map((term) => (
              <button key={term} type="button" className={styles.chip} onClick={() => pickSuggestion(term)}>
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {isTooShort && <p className={styles.hint}>Type at least {MIN_QUERY_LENGTH} characters to search.</p>}

      {error && (
        <div className={styles.state}>
          <h2>Something went wrong</h2>
          <p>{getErrorMessage(error)}</p>
        </div>
      )}

      {isLoading && (
        <>
          <SlowLoadingNotice />
          <MovieGrid isLoading />
        </>
      )}

      {movies && !isLoading && (
        movies.length === 0 ? (
          <div className={styles.state}>
            <h2>No results for &quot;{query}&quot;</h2>
            <p>Try a different title, or check the spelling. Searches work best in English.</p>
          </div>
        ) : (
          <>
            <h2 className={styles.sectionTitle}>
              {movies.length} result{movies.length !== 1 ? 's' : ''} for &quot;{query}&quot;
            </h2>
            <MovieGrid movies={movies} />
          </>
        )
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <SearchContent />
    </Suspense>
  );
}
