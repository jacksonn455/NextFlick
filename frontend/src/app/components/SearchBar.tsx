// frontend/app/components/SearchBar.tsx
'use client';

import { CloseIcon, SearchIcon } from './Icons';
import styles from '../styles/page.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchBar} role="search">
      <SearchIcon size={22} className={styles.searchIcon} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Titles, franchises, characters…"
        className={styles.searchInput}
        aria-label="Search movies"
        autoComplete="off"
        autoFocus
      />
      {value && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <CloseIcon size={20} />
        </button>
      )}
    </form>
  );
}
