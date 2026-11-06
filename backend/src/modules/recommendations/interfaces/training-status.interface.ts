import type { TensorFlowBackend } from '../ml/tf';

export interface EpochLog {
  epoch: number;
  loss: number;
  accuracy: number;
}

export type TrainingState = 'idle' | 'training' | 'ready' | 'failed';

export interface TrainingStatus {
  state: TrainingState;
  backend: TensorFlowBackend;
  epoch: number;
  totalEpochs: number;
  progress: number;
  logs: EpochLog[];
  users: number;
  movies: number;
  positives: number;
  negatives: number;
  startedAt: Date | null;
  trainedAt: Date | null;
  error: string | null;
}

export interface RecommendedMovie {
  imdbID: string;
  title: string;
  year: number | null;
  type: string | null;
  poster: string | null;
  genres: string[];
  rating: number | null;
  score: number | null;
}

export type RecommendationSource = 'model' | 'popular';
