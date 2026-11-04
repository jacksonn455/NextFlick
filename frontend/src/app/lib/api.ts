// frontend/app/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  // The backend sleeps on Render's free plan; the first request can take ~50s
  timeout: 60000,
});

// Turns any request error into a message that can be shown to the user
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Could not reach the server. It may be waking up, please try again in a few seconds.';
    }

    const { status } = error.response;
    if (status === 404) return "We couldn't find that title.";
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (status >= 500) return 'Something went wrong on our side. Please try again.';

    const message = (error.response.data as { message?: unknown })?.message;
    if (typeof message === 'string') return message;
  }

  return 'Something went wrong. Please try again.';
};

// OMDb posters are Amazon images; the "._V1_..." suffix can be swapped for a sharper version
export const getPosterUrl = (poster: string | null | undefined, width?: number): string | null => {
  if (!poster || poster === 'N/A') return null;
  return width ? poster.replace(/\._V1_.*\.(jpg|png)$/, `._V1_SX${width}.$1`) : poster;
};
