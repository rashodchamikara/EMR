LoginPage.tsx
import {
  FormEvent,
  useState,
} from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  if (
    !auth.initializing &&
    auth.authenticated
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ): Promise<void> => {
      event.preventDefault();

      setSubmitting(true);
      setError(null);

      try {
        await auth.login({
          email,
          password,
        });

        const requestedPath =
          (
            location.state as {
              from?: string;
            } | null
          )?.from ?? '/';

        navigate(
          requestedPath,
          {
            replace: true,
          },
        );
      } catch (loginError: unknown) {
        setError(
          loginError instanceof Error
            ? loginError.message
            : 'Unable to log in.',
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <p className="eyebrow">
            EMR Platform
          </p>

          <h1>
            Secure clinical access
          </h1>

          <p>
            Sign in using your assigned
            healthcare system account.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <div>
            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              required
            />
          </div>

          <div>
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              minLength={12}
              required
            />
          </div>

          {error && (
            <div
              className="form-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? 'Signing in…'
              : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}