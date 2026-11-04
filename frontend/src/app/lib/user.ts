// frontend/app/lib/user.ts
import { useSyncExternalStore } from 'react';

// Remembers which user was picked in the switcher (the user's MongoDB _id)
const STORAGE_KEY = 'nextflick:userId';
const CHANGE_EVENT = 'nextflick:user-change';

// Storage can throw in private windows or when site data is blocked
const getStoredUserId = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredUserId = (userId: string) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, userId);
  } catch {
    // Not persisted; the change still applies until the page reloads
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  // Keeps other tabs in sync
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

export const useStoredUserId = () =>
  useSyncExternalStore(subscribe, getStoredUserId, () => null);

// Favorites (and later recommendations) belong to the user sent in this header
export const userHeaders = (userId: string) => ({ 'x-user-id': userId });

// Same rule as the backend's CreateUserDto
export const USERNAME_PATTERN = /^[a-z0-9-]{3,30}$/;

// "Ana Lima" -> "ana-lima", "João Mendes" -> "joao-mendes"
export const toUsername = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
