// frontend/app/types/recommendation.ts
import { Movie } from './movie';

export interface RecommendedMovie {
  imdbID: string;
  title: string;
  year: number | null;
  type: string | null;
  poster: string | null;
  genres: string[];
  rating: number | null;
  // Predicted probability (0-1); null for popular fallbacks
  score: number | null;
}

// "model": personalized by the neural network
// "popular": the model is still training, or the user has no favorites yet
export type RecommendationSource = 'model' | 'popular';

export type TrainingState = 'idle' | 'training' | 'ready' | 'failed';

export interface RecommendationsResponse {
  success: boolean;
  source: RecommendationSource;
  model: TrainingState;
  data: RecommendedMovie[];
  count: number;
}

export const recommendedToMovie = (movie: RecommendedMovie): Movie => ({
  imdbID: movie.imdbID,
  Title: movie.title,
  Year: movie.year ? String(movie.year) : '',
  Type: movie.type ?? undefined,
  Poster: movie.poster,
});
