// frontend/app/context/MovieModalContext.tsx
'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import MovieDetailsModal from '../components/MovieDetailsModal';
import { Movie } from '../types/movie';

interface MovieModalContextValue {
  openMovie: (movie: Movie) => void;
}

const MovieModalContext = createContext<MovieModalContextValue | null>(null);

export function MovieModalProvider({ children }: { children: React.ReactNode }) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const openMovie = useCallback((movie: Movie) => setSelectedMovie(movie), []);
  const closeMovie = useCallback(() => setSelectedMovie(null), []);

  return (
    <MovieModalContext.Provider value={{ openMovie }}>
      {children}
      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={closeMovie} />}
    </MovieModalContext.Provider>
  );
}

export const useMovieModal = () => {
  const context = useContext(MovieModalContext);
  if (!context) throw new Error('useMovieModal must be used inside MovieModalProvider');
  return context;
};
