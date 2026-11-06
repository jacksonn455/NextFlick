// frontend/app/components/RecommendationsSection.tsx
'use client';

import { useState } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { useRecommendations } from '../hooks/useRecommendations';
import { useUsers } from '../hooks/useUsers';
import { getErrorMessage } from '../lib/api';
import { recommendedToMovie } from '../types/recommendation';
import MovieRow from './MovieRow';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/recommendations.module.css';

// From this many titles in My List, recommendations show up without a click
export const AUTO_RECOMMEND_AT = 3;

export default function RecommendationsSection() {
  const { currentUser } = useUsers();
  const { favorites, isLoading: isLoadingFavorites } = useFavorites();
  const userId = currentUser?._id;

  // Remembers who clicked the button, so switching users goes back to the prompt
  const [requestedFor, setRequestedFor] = useState<string | null>(null);

  const favoriteCount = favorites?.length ?? 0;
  const isVisible = favoriteCount >= AUTO_RECOMMEND_AT || (!!userId && requestedFor === userId);
  const { data, isLoading, error, refetch } = useRecommendations(userId, isVisible);

  if (!userId || isLoadingFavorites) return null;

  if (!isVisible) {
    const missing = AUTO_RECOMMEND_AT - favoriteCount;

    return (
      <section className={styles.prompt} aria-labelledby="recommendations-prompt-title">
        <div>
          <h2 id="recommendations-prompt-title" className={styles.promptTitle}>
            Find your next favorite
          </h2>
          <p className={styles.promptText}>
            {favoriteCount === 0
              ? `Add ${AUTO_RECOMMEND_AT} titles to My List and we'll recommend movies and series you'll like.`
              : `Add ${missing} more ${missing === 1 ? 'title' : 'titles'} to My List for automatic recommendations, or get them now.`}
          </p>
        </div>
        <button
          type="button"
          className={`${buttons.btn} ${buttons.primary}`}
          onClick={() => setRequestedFor(userId)}
        >
          Recommend movies &amp; series
        </button>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.prompt} role="alert">
        <p className={styles.promptText}>Couldn&apos;t load recommendations. {getErrorMessage(error)}</p>
        <button type="button" className={`${buttons.btn} ${buttons.secondary}`} onClick={() => refetch()}>
          Try again
        </button>
      </section>
    );
  }

  const isPersonalized = data?.source === 'model';
  const subtitle =
    data?.model === 'training'
      ? 'Our model is learning everyone’s taste. Personalized picks will appear here in a moment.'
      : isPersonalized
        ? `Picked by our model from the ${favoriteCount} ${favoriteCount === 1 ? 'title' : 'titles'} in My List`
        : 'Add titles to My List to get picks based on your taste.';

  return (
    <MovieRow
      title={isPersonalized ? 'Recommended for you' : 'Popular on NextFlick'}
      subtitle={data ? subtitle : undefined}
      movies={data?.data.map(recommendedToMovie)}
      isLoading={isLoading}
      badges={
        isPersonalized
          ? Object.fromEntries(
              data.data.map((movie) => [movie.imdbID, `${Math.round((movie.score ?? 0) * 100)}% match`]),
            )
          : undefined
      }
    />
  );
}
