// frontend/app/watch/page.tsx
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from '../components/SearchBar';
import FreeMovieCard from '../components/FreeMovieCard';
import { ContinueWatchingRow, FreeMovieRow, toCardData } from '../components/FreeMovieRow';
import WatchHero from '../components/WatchHero';
import WatchFilters, { DECADES, WatchFilterValues } from '../components/WatchFilters';
import { SlowLoadingNotice } from '../components/MovieGrid';
import { useFreeCatalog, useFreeCatalogPages, useFreeSources } from '../hooks/useFreeMovies';
import { getErrorMessage } from '../lib/api';
import {
  ContentType,
  FreeCatalogFilters,
  FreeMovie,
  MovieSource,
  SOURCE_LABELS,
} from '../types/freeMovie';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/watch.module.css';

const DEBOUNCE_MS = 500;
// One request feeds the hero and every row on the browse view
const BROWSE_LIMIT = 80;
const RESULTS_PAGE_SIZE = 40;
const ROW_SIZE = 20;
const CLASSIC_BEFORE = 1970;

const SOURCES: MovieSource[] = ['archive', 'loc', 'peertube', 'youtube'];
const CONTENT_TYPES: ContentType[] = ['feature', 'short'];

// Filters live in the URL so results can be shared and survive a reload
function readFilters(params: URLSearchParams): WatchFilterValues & { query: string } {
  const source = params.get('source') as MovieSource;
  const type = params.get('type') as ContentType;
  const decade = params.get('decade') ?? undefined;
  return {
    query: params.get('q') ?? '',
    source: SOURCES.includes(source) ? source : undefined,
    genre: params.get('genre') ?? undefined,
    decade: DECADES.some((d) => d.value === decade) ? decade : undefined,
    contentType: CONTENT_TYPES.includes(type) ? type : undefined,
    freeOnly: params.get('free') !== 'all',
  };
}

function buildUrl(values: WatchFilterValues & { query: string }): string {
  const params = new URLSearchParams();
  if (values.query.trim()) params.set('q', values.query.trim());
  if (values.source) params.set('source', values.source);
  if (values.genre) params.set('genre', values.genre);
  if (values.decade) params.set('decade', values.decade);
  if (values.contentType) params.set('type', values.contentType);
  if (!values.freeOnly) params.set('free', 'all');
  const query = params.toString();
  return query ? `/watch?${query}` : '/watch';
}

function toCatalogFilters(values: WatchFilterValues & { query: string }): FreeCatalogFilters {
  const decade = DECADES.find((d) => d.value === values.decade);
  return {
    query: values.query,
    source: values.source,
    genre: values.genre,
    yearFrom: decade?.from,
    yearTo: decade?.to,
    contentType: values.contentType,
    freeOnly: values.freeOnly,
  };
}

const newestFirst = (a: FreeMovie, b: FreeMovie) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');

// Prefers films with large artwork and a synopsis for the hero
function pickFeatured(movies: FreeMovie[]): FreeMovie | undefined {
  const score = (movie: FreeMovie) =>
    (movie.description ? 2 : 0) + (movie.source !== 'archive' && movie.thumbnail ? 2 : 0) + (movie.contentType === 'feature' ? 1 : 0);
  return [...movies].sort((a, b) => score(b) - score(a))[0];
}

// Hero and rows share one cached query
function useBrowseCatalog() {
  const query = useFreeCatalog({}, BROWSE_LIMIT);
  const movies = useMemo(() => query.data?.movies ?? [], [query.data]);
  const featured = useMemo(() => pickFeatured(movies), [movies]);
  return { ...query, movies, featured };
}

function BrowseHero() {
  const { featured, isLoading, error } = useBrowseCatalog();
  if (error || (!isLoading && !featured)) return <div className={styles.heroFallback} />;
  return <WatchHero movie={featured} isLoading={isLoading} />;
}

function BrowseView() {
  const { data, movies, featured, isLoading, error, refetch } = useBrowseCatalog();

  const rows = useMemo(() => {
    const rest = movies.filter((movie) => movie !== featured);
    const take = (list: FreeMovie[]) => list.slice(0, ROW_SIZE).map(toCardData);
    return [
      { title: 'Featured Movies', testId: 'row-featured', items: take(rest) },
      {
        title: 'Recently Added',
        testId: 'row-recent',
        items: take(rest.filter((m) => m.publishedAt).sort(newestFirst)),
      },
      { title: 'Full-Length Movies', testId: 'row-feature', items: take(rest.filter((m) => m.contentType === 'feature')) },
      {
        title: 'Classic Movies',
        testId: 'row-classic',
        items: take(rest.filter((m) => Number(m.year) > 0 && Number(m.year) < CLASSIC_BEFORE)),
      },
      {
        title: 'Independent Movies',
        testId: 'row-independent',
        items: take(rest.filter((m) => m.source === 'peertube' || m.source === 'youtube')),
      },
      { title: 'Short Films', testId: 'row-short', items: take(rest.filter((m) => m.contentType === 'short')) },
      { title: 'Internet Archive Collection', testId: 'row-archive', items: take(rest.filter((m) => m.source === 'archive')) },
      { title: 'Library of Congress', testId: 'row-loc', items: take(rest.filter((m) => m.source === 'loc')) },
      { title: 'PeerTube Discoveries', testId: 'row-peertube', items: take(rest.filter((m) => m.source === 'peertube')) },
      { title: 'YouTube Movies', testId: 'row-youtube', items: take(rest.filter((m) => m.source === 'youtube')) },
    ];
  }, [movies, featured]);

  if (error) {
    return (
      <div className={styles.state} role="alert">
        <h2>Free movies are unavailable</h2>
        <p>{getErrorMessage(error)}</p>
        <button type="button" className={`${buttons.btn} ${buttons.secondary}`} onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <SlowLoadingNotice />
        {[0, 1, 2].map((i) => (
          <FreeMovieRow key={i} title="Loading…" testId={`row-loading-${i}`} isLoading />
        ))}
      </>
    );
  }

  if (!movies.length) {
    return (
      <div className={styles.state}>
        <h2>No free movies right now</h2>
        <p>Please come back in a few minutes.</p>
      </div>
    );
  }

  return (
    <>
      <ContinueWatchingRow />
      {rows.map((row) => (
        <FreeMovieRow key={row.testId} {...row} />
      ))}
      <UnavailableNotice sources={data?.unavailableSources} />
    </>
  );
}

function UnavailableNotice({ sources }: { sources?: MovieSource[] }) {
  if (!sources?.length) return null;
  return (
    <p className={styles.notice} role="status">
      Some sources are temporarily unavailable: {sources.map((s) => SOURCE_LABELS[s]).join(', ')}.
    </p>
  );
}

function ResultsView({ filters, onClear }: { filters: FreeCatalogFilters; onClear: () => void }) {
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useFreeCatalogPages(
    filters,
    RESULTS_PAGE_SIZE,
  );

  // Later pages may repeat a film already shown
  const movies = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? [])
      .flatMap((page) => page.movies)
      .filter((movie) => !seen.has(movie.identifier) && !!seen.add(movie.identifier));
  }, [data]);
  const unavailable = data?.pages.at(-1)?.unavailableSources;

  if (error) {
    return (
      <div className={styles.state} role="alert">
        <h2>Search failed</h2>
        <p>{getErrorMessage(error)}</p>
        <button type="button" className={`${buttons.btn} ${buttons.secondary}`} onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label="Loading results">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={styles.cardSkeleton} />
        ))}
      </div>
    );
  }

  if (!movies.length) {
    return (
      <div className={styles.state} data-testid="watch-empty">
        <h2>{filters.query ? `No free movies for “${filters.query.trim()}”` : 'No free movies match these filters'}</h2>
        <p>Try another title, fewer filters, or include publicly available films.</p>
        <button type="button" className={`${buttons.btn} ${buttons.secondary}`} onClick={onClear}>
          Clear search and filters
        </button>
        <UnavailableNotice sources={unavailable} />
      </div>
    );
  }

  return (
    <>
      <p className={styles.resultCount} role="status">
        {movies.length} film{movies.length === 1 ? '' : 's'}
      </p>
      <div className={styles.grid} data-testid="free-movies-grid">
        {movies.map((movie) => (
          <FreeMovieCard key={movie.identifier} {...toCardData(movie)} />
        ))}
      </div>
      {hasNextPage && (
        <div className={styles.more}>
          <button
            type="button"
            className={`${buttons.btn} ${buttons.secondary}`}
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
      <UnavailableNotice sources={unavailable} />
    </>
  );
}

function WatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = useMemo(() => readFilters(searchParams), [searchParams]);
  const [input, setInput] = useState(current.query);
  const { data: meta } = useFreeSources();

  const update = (values: WatchFilterValues & { query: string }) =>
    router.replace(buildUrl(values), { scroll: false });

  // Debounced search: each distinct query is a (cached) backend search
  useEffect(() => {
    if (input.trim() === current.query.trim()) return;
    const timeout = setTimeout(() => update({ ...current, query: input }), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const hasFilters =
    !!current.source || !!current.genre || !!current.decade || !!current.contentType || !current.freeOnly;
  const isSearching = hasFilters || !!current.query.trim();

  const clear = () => {
    setInput('');
    router.replace('/watch', { scroll: false });
  };

  return (
    <div className={styles.page}>
      {!isSearching && <BrowseHero />}
      <div className={`${styles.toolbar} ${isSearching ? styles.toolbarTop : ''}`}>
        <div className={styles.toolbarHead}>
          <h1 className={styles.pageTitle}>Free to Watch</h1>
          <p className={styles.intro}>
            Public domain and openly licensed films from the Internet Archive, the Library of Congress, PeerTube and
            YouTube. Every film shows its source and license.
          </p>
        </div>
        <SearchBar
          value={input}
          onChange={setInput}
          onSubmit={() => update({ ...current, query: input })}
          label="Search free movies"
          placeholder="Search free films by title…"
          autoFocus={false}
          className={styles.search}
        />
        <WatchFilters
          values={current}
          sources={meta?.sources ?? []}
          genres={meta?.genres ?? []}
          onChange={(values) => update({ ...values, query: input })}
          onClear={clear}
          hasActiveFilters={hasFilters}
        />
      </div>

      <div className={styles.content}>
        {isSearching ? <ResultsView filters={toCatalogFilters(current)} onClear={clear} /> : <BrowseView />}
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <WatchContent />
    </Suspense>
  );
}
