// frontend/app/components/WatchFilters.tsx
'use client';

import { ContentType, FreeSourceStatus, MovieSource } from '../types/freeMovie';
import styles from '../styles/watch.module.css';

// Release year filter, by decade
export const DECADES: { value: string; label: string; from?: number; to?: number }[] = [
  { value: 'pre1930', label: 'Before 1930', to: 1929 },
  ...[1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((start) => ({
    value: String(start),
    label: `${start}s`,
    from: start,
    to: start + 9,
  })),
];

export interface WatchFilterValues {
  source?: MovieSource;
  genre?: string;
  decade?: string;
  contentType?: ContentType;
  freeOnly: boolean;
}

interface WatchFiltersProps {
  values: WatchFilterValues;
  sources: FreeSourceStatus[];
  genres: string[];
  onChange: (values: WatchFilterValues) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export default function WatchFilters({
  values,
  sources,
  genres,
  onChange,
  onClear,
  hasActiveFilters,
}: WatchFiltersProps) {
  const set = <K extends keyof WatchFilterValues>(key: K, value: WatchFilterValues[K]) =>
    onChange({ ...values, [key]: value || undefined });

  return (
    <div className={styles.filters} role="group" aria-label="Filter free movies">
      <label className={styles.filter}>
        <span>Source</span>
        <select
          value={values.source ?? ''}
          onChange={(e) => set('source', e.target.value as MovieSource)}
          data-testid="filter-source"
        >
          <option value="">All sources</option>
          {sources
            .filter((source) => source.enabled)
            .map((source) => (
              <option key={source.source} value={source.source}>
                {source.label}
                {source.available ? '' : ' (unavailable)'}
              </option>
            ))}
        </select>
      </label>

      <label className={styles.filter}>
        <span>Genre</span>
        <select value={values.genre ?? ''} onChange={(e) => set('genre', e.target.value)} data-testid="filter-genre">
          <option value="">All genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filter}>
        <span>Release year</span>
        <select value={values.decade ?? ''} onChange={(e) => set('decade', e.target.value)} data-testid="filter-year">
          <option value="">Any year</option>
          {DECADES.map((decade) => (
            <option key={decade.value} value={decade.value}>
              {decade.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filter}>
        <span>Type</span>
        <select
          value={values.contentType ?? ''}
          onChange={(e) => set('contentType', e.target.value as ContentType)}
          data-testid="filter-type"
        >
          <option value="">Any length</option>
          <option value="feature">Full-length films</option>
          <option value="short">Short films</option>
        </select>
      </label>

      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={values.freeOnly}
          onChange={(e) => onChange({ ...values, freeOnly: e.target.checked })}
          data-testid="filter-free"
        />
        <span>Free to watch only</span>
      </label>

      {hasActiveFilters && (
        <button type="button" className={styles.clear} onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
