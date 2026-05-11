import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { exchangeGoogleCode } from '../../../features/google-auth';
import {
  readGoogleAuthorizationCode,
  readGoogleAuthorizationError,
} from '../../../features/google-auth/lib/oauth';
import { writeAuthSession } from '../../../features/google-auth/lib/session';
import '../../../features/google-auth/ui/google-auth-page.css';

export function GoogleCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const authorizationError = readGoogleAuthorizationError(location.search);
    if (authorizationError) {
      setErrorMessage(`Google login failed: ${authorizationError}`);
      return;
    }

    const code = readGoogleAuthorizationCode(location.search);
    if (!code) {
      setErrorMessage('Google authorization code is missing.');
      return;
    }

    const abortController = new AbortController();

    async function run() {
      try {
        const session = await exchangeGoogleCode(location.search, {
          signal: abortController.signal,
        });

        writeAuthSession(session);
        navigate('/map', { replace: true });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Google login could not be completed.',
        );
      }
    }

    void run();

    return () => abortController.abort();
  }, [location.search, navigate]);

  return (
    <main className="login-page">
      <section className="login-page__panel">
        <span className="login-page__badge">Google OAuth</span>
        <div className="login-page__hero">
          <h1>Completing sign in</h1>
          <p>{errorMessage || 'Sending the Google callback to the backend session endpoint.'}</p>
        </div>
      </section>
    </main>
  );
}
