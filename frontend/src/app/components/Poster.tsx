// frontend/app/components/Poster.tsx
'use client';

import { useState } from 'react';
import { getPosterUrl } from '../lib/api';
import { FilmIcon } from './Icons';
import styles from '../styles/card.module.css';

interface PosterProps {
  src: string | null | undefined;
  title: string;
  width?: number;
  className?: string;
  eager?: boolean;
}

export default function Poster({ src, title, width, className = '', eager = false }: PosterProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const url = getPosterUrl(src, width);

  if (!url || failedSrc === url) {
    return (
      <div className={`${styles.placeholder} ${className}`}>
        <FilmIcon size={32} />
        <span>{title}</span>
      </div>
    );
  }

  return (
    // OMDb posters come from several CDNs, so a plain img is used instead of next/image
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${title} poster`}
      className={`${styles.image} ${className}`}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailedSrc(url)}
    />
  );
}
