// frontend/app/components/NewUserDialog.tsx
'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useCreateUser } from '../hooks/useUsers';
import { getErrorMessage } from '../lib/api';
import { toUsername, USERNAME_PATTERN } from '../lib/user';
import { useToast } from '../context/ToastContext';
import { CloseIcon } from './Icons';
import buttons from '../styles/buttons.module.css';
import modal from '../styles/modal.module.css';
import styles from '../styles/userForm.module.css';

interface NewUserDialogProps {
  onClose: () => void;
}

export default function NewUserDialog({ onClose }: NewUserDialogProps) {
  const createUser = useCreateUser();
  const { showToast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const usernameHintId = useId();

  const [name, setName] = useState('');
  // Follows the name until the user types a username of their own
  const [customUsername, setCustomUsername] = useState<string | null>(null);
  const username = customUsername ?? toUsername(name);

  const isNameValid = name.trim().length > 0 && name.trim().length <= 60;
  const isUsernameValid = USERNAME_PATTERN.test(username);

  // Lock page scroll, close on Escape and move focus into the dialog while open
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nameInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isNameValid || !isUsernameValid) return;

    createUser.mutate(
      { name: name.trim(), username },
      {
        onSuccess: (user) => {
          showToast(`Welcome, ${user.name}! Pick some favorites to get recommendations.`);
          onClose();
        },
      },
    );
  };

  return (
    <div className={modal.overlay} onClick={onClose}>
      <div
        className={`${modal.dialog} ${styles.dialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={modal.close} onClick={onClose} aria-label="Close">
          <CloseIcon size={22} />
        </button>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <h2 id={titleId} className={styles.title}>
            New user
          </h2>
          <p className={styles.intro}>
            Each user has their own list. Use new users to test how recommendations change with different
            tastes.
          </p>

          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input
              ref={nameInputRef}
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="off"
              placeholder="e.g. Eva Souza"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Username</span>
            <input
              className={styles.input}
              value={username}
              onChange={(e) => setCustomUsername(e.target.value.toLowerCase())}
              maxLength={30}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={username.length > 0 && !isUsernameValid}
              aria-describedby={usernameHintId}
              required
            />
            <span
              id={usernameHintId}
              className={`${styles.hint} ${username.length > 0 && !isUsernameValid ? styles.hintError : ''}`}
            >
              3-30 lowercase letters, numbers or &quot;-&quot;
            </span>
          </label>

          {createUser.error && (
            <p className={styles.error} role="alert">
              {getErrorMessage(createUser.error)}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" className={`${buttons.btn} ${buttons.secondary}`} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`${buttons.btn} ${buttons.primary}`}
              disabled={!isNameValid || !isUsernameValid || createUser.isPending}
            >
              {createUser.isPending ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
