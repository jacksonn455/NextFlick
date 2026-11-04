// frontend/app/components/UserSwitcher.tsx
'use client';

import { useCallback, useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { PlusIcon } from './Icons';
import NewUserDialog from './NewUserDialog';
import styles from '../styles/navbar.module.css';

export default function UserSwitcher() {
  const { users, currentUser, selectUser } = useUsers();
  const [isCreating, setIsCreating] = useState(false);
  const closeDialog = useCallback(() => setIsCreating(false), []);

  if (!users?.length || !currentUser) return null;

  return (
    <div className={styles.userSwitcher}>
      <span className={styles.avatar} aria-hidden="true">
        {currentUser.name.charAt(0)}
      </span>
      <select
        className={styles.userSelect}
        aria-label="Current user"
        value={currentUser._id}
        onChange={(event) => selectUser(event.target.value)}
      >
        {users.map((user) => (
          <option key={user._id} value={user._id}>
            {user.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => setIsCreating(true)}
        aria-label="Add user"
        title="Add user"
      >
        <PlusIcon size={20} />
      </button>

      {isCreating && <NewUserDialog onClose={closeDialog} />}
    </div>
  );
}
