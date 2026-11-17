// frontend/app/components/VideoPlayer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSaveProgress } from '../hooks/useWatchHistory';
import { FreeMovieDetails, SOURCE_LABELS } from '../types/freeMovie';
import buttons from '../styles/buttons.module.css';
import styles from '../styles/free.module.css';

interface VideoPlayerProps {
  movie: FreeMovieDetails;
  // Seconds to resume from
  startAt?: number;
}

// How often the position is saved while playing
const SAVE_INTERVAL_MS = 15_000;
// Resuming this close to the end would just show the credits
const RESUME_MARGIN_S = 10;

export default function VideoPlayer({ movie, startAt = 0 }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedAt = useRef(0);
  // Last known position: the <video> ref is already detached when the page unmounts
  const lastKnown = useRef({ position: 0, duration: 0, saved: true });
  const [failed, setFailed] = useState(false);
  // Changing the key remounts the <video>, which retries the download
  const [attempt, setAttempt] = useState(0);
  const saveProgress = useSaveProgress(movie.identifier);

  const track = () => {
    const video = videoRef.current;
    if (video) lastKnown.current = { position: video.currentTime, duration: video.duration, saved: false };
  };

  const save = () => {
    track();
    const { position, duration, saved } = lastKnown.current;
    if (saved) return;
    lastSavedAt.current = Date.now();
    lastKnown.current.saved = true;
    saveProgress(position, duration);
  };

  // Keeps the latest save for the unmount cleanup below
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  // Saves where the user stopped when leaving the page
  useEffect(() => () => saveRef.current(), []);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && startAt > 0 && startAt < video.duration - RESUME_MARGIN_S) {
      video.currentTime = startAt;
    }
  };

  const handleTimeUpdate = () => {
    track();
    if (Date.now() - lastSavedAt.current >= SAVE_INTERVAL_MS) save();
  };

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  return (
    <div className={styles.player}>
      {failed ? (
        <div className={styles.playerError} role="alert" data-testid="player-error">
          <p>
            <strong>This video couldn&apos;t be played.</strong> The file may be temporarily unavailable on the{' '}
            {SOURCE_LABELS[movie.source] ?? 'source'} website.
          </p>
          <div className={styles.actions}>
            <button type="button" className={`${buttons.btn} ${buttons.primary}`} onClick={retry}>
              Try again
            </button>
            <a
              className={`${buttons.btn} ${buttons.secondary}`}
              href={movie.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on {SOURCE_LABELS[movie.source] ?? 'the source website'}
            </a>
          </div>
        </div>
      ) : (
        <video
          key={attempt}
          ref={videoRef}
          data-testid="video-player"
          src={movie.videoUrl ?? undefined}
          poster={movie.thumbnail}
          controls
          autoPlay
          playsInline
          preload="metadata"
          aria-label={`${movie.title} video player`}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPause={save}
          onEnded={save}
          onError={() => setFailed(true)}
        >
          Your browser does not support HTML5 video.
        </video>
      )}
    </div>
  );
}
