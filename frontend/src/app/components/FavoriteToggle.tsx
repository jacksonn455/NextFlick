// frontend/app/components/FavoriteToggle.tsx
'use client';

import { useFavorites } from '../hooks/useFavorites';
import { Movie } from '../types/movie';
import { CheckIcon, PlusIcon } from './Icons';
import styles from '../styles/buttons.module.css';

interface FavoriteToggleProps {
  movie: Movie;
  // "icon" is the round button used over posters, "full" the labelled button in hero and modal
  variant?: 'icon' | 'full';
  className?: string;
}

export default function FavoriteToggle({ movie, variant = 'full', className = '' }: FavoriteToggleProps) {
  const { checkIsFavorite, toggleFavorite, isPending } = useFavorites();
  const isFavorite = checkIsFavorite(movie.imdbID);
  const label = isFavorite ? `Remove ${movie.Title} from My List` : `Add ${movie.Title} to My List`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(movie);
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`${styles.round} ${isFavorite ? styles.roundActive : ''} ${className}`}
        onClick={handleClick}
        disabled={isPending}
        aria-label={label}
        aria-pressed={isFavorite}
        title={isFavorite ? 'Remove from My List' : 'Add to My List'}
      >
        {isFavorite ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.secondary} ${className}`}
      onClick={handleClick}
      disabled={isPending}
      aria-label={label}
      aria-pressed={isFavorite}
    >
      {isFavorite ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
      {isFavorite ? 'In My List' : 'My List'}
    </button>
  );
}
