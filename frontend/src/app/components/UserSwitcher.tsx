// frontend/app/components/UserSwitcher.tsx
'use client';

import { DEMO_USERS, setCurrentUserId, useCurrentUserId } from '../lib/user';
import styles from '../styles/navbar.module.css';

export default function UserSwitcher() {
  const userId = useCurrentUserId();
  const currentUser = DEMO_USERS.find((user) => user.id === userId) ?? DEMO_USERS[0];

  return (
    <label className={styles.userSwitcher}>
      <span className={styles.avatar} aria-hidden="true">
        {currentUser.name.charAt(0)}
      </span>
      <select
        className={styles.userSelect}
        aria-label="Current user"
        value={currentUser.id}
        onChange={(event) => setCurrentUserId(event.target.value)}
      >
        {DEMO_USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </label>
  );
}
