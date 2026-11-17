// frontend/app/components/SearchBar.tsx
'use client';

import { CloseIcon, SearchIcon } from './Icons';
import styles from '../styles/page.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  label = 'Search movies',
  placeholder = 'Titles, franchises, characters…',
  autoFocus = true,
  className = '',
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className={`${styles.searchBar} ${className}`} role="search">
      <SearchIcon size={22} className={styles.searchIcon} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.searchInput}
        aria-label={label}
        autoComplete="off"
        autoFocus={autoFocus}
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
