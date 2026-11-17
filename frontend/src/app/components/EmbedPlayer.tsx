// frontend/app/components/EmbedPlayer.tsx
'use client';

import { useState } from 'react';
import { FreeMovieDetails, SOURCE_LABELS } from '../types/freeMovie';
import { ExternalIcon } from './Icons';
import styles from '../styles/free.module.css';

interface EmbedPlayerProps {
  movie: FreeMovieDetails;
}

// The user pressed Watch Now, so the official player may start right away
const withAutoplay = (url: string) => {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('autoplay', '1');
    return parsed.toString();
  } catch {
    return null;
  }
};

// Official embedded player of the source (YouTube, PeerTube): the video is never
// downloaded or proxied by NextFlick
export default function EmbedPlayer({ movie }: EmbedPlayerProps) {
  const [loaded, setLoaded] = useState(false);
  const src = movie.embedUrl?.startsWith('https://') ? withAutoplay(movie.embedUrl) : null;
  const sourceLabel = SOURCE_LABELS[movie.source];

  if (!src) {
    return (
      <div className={styles.player}>
        <div className={styles.playerError} role="alert" data-testid="player-error">
          <p>
            <strong>This video can&apos;t be played here.</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.player}>
        {!loaded && <div className={styles.playerLoading} aria-hidden="true" />}
        <iframe
          src={src}
          title={`${movie.title} — ${sourceLabel} player`}
          data-testid="embed-player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoaded(true)}
        />
      </div>
      {/* Embedded players report errors inside their own frame; offer a way out */}
      <p className={styles.embedHelp}>
        Video not starting? The owner may have removed or restricted it.{' '}
        <a href={movie.sourceUrl} target="_blank" rel="noopener noreferrer">
          Watch on {sourceLabel} <ExternalIcon size={12} />
        </a>
      </p>
    </>
  );
}
