// frontend/app/components/MovieCard.tsx
"use client";

import { useState } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import styles from '../styles/search.module.css';

interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Type?: string;
  Poster: string;
}

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const { checkIsFavorite, addFavorite, removeFavorite } = useFavorites();
  
  // Check if this movie is already favorited
  const isFavorited = checkIsFavorite(movie.imdbID);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (isFavorited) {
        // Remove from favorites
        console.log('Removing from favorites:', movie.imdbID);
        await removeFavorite.mutateAsync(movie.imdbID);
        console.log('Successfully removed from favorites');
      } else {
        // Add to favorites
        console.log('Adding to favorites:', movie);
        await addFavorite.mutateAsync(movie);
        console.log('Successfully added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Optionally show an error message to the user
      alert('Failed to update favorites. Please try again.');
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleCardClick = () => {
    // Here you would typically navigate to movie details page
    console.log('Navigate to movie details:', movie.imdbID);
  };

  return (
    <div className={styles['movie-card']} onClick={handleCardClick}>
      <div className={styles['movie-poster-container']}>
        {!imageError && movie.Poster !== 'N/A' ? (
          <img
            src={movie.Poster}
            alt={movie.Title}
            className={styles['movie-poster']}
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className={styles['movie-poster-placeholder']}>
            🎬
          </div>
        )}
        
        <button
          className={`${styles['favorite-button']} ${isFavorited ? styles.favorited : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          disabled={addFavorite.isPending || removeFavorite.isPending}
          style={{
            opacity: addFavorite.isPending || removeFavorite.isPending ? 0.6 : 1,
            cursor: addFavorite.isPending || removeFavorite.isPending ? 'wait' : 'pointer'
          }}
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>
      </div>
      
      <div className={styles['movie-info']}>
        <h3 className={styles['movie-title']}>{movie.Title}</h3>
        <p className={styles['movie-year']}>{movie.Year}</p>
        {movie.Type && <span className={styles['movie-type']}>{movie.Type}</span>}
      </div>
    </div>
  );
}