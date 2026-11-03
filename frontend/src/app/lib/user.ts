// frontend/app/lib/user.ts
import { useSyncExternalStore } from 'react';

export interface DemoUser {
  id: string;
  name: string;
}

// There is no login yet: each demo user has its own favorites list on the backend.
// "user-123" is the backend default, so favorites saved before this change stay visible.
export const DEMO_USERS: DemoUser[] = [
  { id: 'user-123', name: 'Guest' },
  { id: 'ana-lima', name: 'Ana Lima' },
  { id: 'bruno-ferreira', name: 'Bruno Ferreira' },
  { id: 'carla-souza', name: 'Carla Souza' },
  { id: 'diego-alves', name: 'Diego Alves' },
];

export const DEFAULT_USER_ID = DEMO_USERS[0].id;

const STORAGE_KEY = 'nextflick:userId';
const CHANGE_EVENT = 'nextflick:user-change';

// Storage can throw in private windows or when site data is blocked
export const getCurrentUserId = (): string => {
  if (typeof window === 'undefined') return DEFAULT_USER_ID;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return DEMO_USERS.some((user) => user.id === stored) ? stored! : DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
};

export const setCurrentUserId = (userId: string) => {
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

export const useCurrentUserId = () =>
  useSyncExternalStore(subscribe, getCurrentUserId, () => DEFAULT_USER_ID);
