// frontend/app/search/page.tsx
"use client";

import { useState } from "react";
import SearchBar from "../components/SearchBar";
import MovieCard from "../components/MovieCard";
import { useMovies } from "../hooks/useMovies";
import styles from '../styles/search.module.css';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: movies, isLoading, error } = useMovies(searchQuery);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className={styles['movie-search-container']}>
      <div className={styles.container}>
        <h1 className={styles['movie-search-title']}>
          🔍 Search Movies
        </h1>

        <div className={styles['search-container']}>
          <SearchBar onSearch={handleSearch} />
        </div>

        {isLoading && (
          <div className={styles['loading-container']}>
            <div className={styles['loading-spinner']}></div>
            <p className={styles['loading-text']}>Searching for movies...</p>
          </div>
        )}

        {error && (
          <div className={styles['error-message']}>
            Error: {error.message}
          </div>
        )}

        {movies && (
          <div className={styles['results-section']}>
            <h2 className={styles['movie-search-subtitle']}>
              Results for &quot;{searchQuery}&quot; ({movies.length} movies)
            </h2>

            {movies.length === 0 ? (
              <div className={styles['empty-state']}>
                <h3>No movies found</h3>
                <p>
                  No movies found for &quot;{searchQuery}&quot;. Try a different search
                  term.
                </p>
              </div>
            ) : (
              <div className={styles['movies-grid']}>
                {movies.map((movie) => (
                  <MovieCard key={movie.imdbID} movie={movie} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}