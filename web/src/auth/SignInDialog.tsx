import { useState } from 'react';
import { Button, TextField } from '../ui/controls';
import type { SessionStore } from '../state/useSession';

type Mode = 'signIn' | 'register';

export function SignInDialog({ store, onClose }: { store: SessionStore; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await (mode === 'signIn' ? store.signIn(email, password) : store.register(email, password));
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? // Identity's own message for a bad login is deliberately vague, and that is correct —
            // saying "no such account" tells an attacker which addresses are registered.
            'That email and password did not match. Passwords must be at least 10 characters.'
          : 'Something went wrong.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Sign in">
      <form className="dialog" onSubmit={submit}>
        <h2 className="dialog-title">{mode === 'signIn' ? 'Sign in' : 'Create an account'}</h2>
        <p className="dialog-lead">
          Your CV is saved in this browser either way. An account syncs it across devices and keeps
          a version history.
        </p>

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          required
        />
        <TextField
          label="Password"
          type="password"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          value={password}
          onChange={setPassword}
          hint={mode === 'register' ? 'At least 10 characters. Length beats punctuation.' : undefined}
          required
        />

        {error ? (
          <p className="assist-note assist-note-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dialog-actions">
          <Button variant="quiet" onClick={onClose}>
            Not now
          </Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
          </Button>
        </div>

        <button
          type="button"
          className="dialog-switch"
          onClick={() => setMode(mode === 'signIn' ? 'register' : 'signIn')}
        >
          {mode === 'signIn' ? 'I do not have an account' : 'I already have an account'}
        </button>
      </form>
    </div>
  );
}
