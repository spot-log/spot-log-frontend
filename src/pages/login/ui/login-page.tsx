import { redirectToGoogleAuthorization } from '../../../features/google-auth';
import { googleOAuthClientId } from '../../../shared/config';
import { SocialLoginButton } from '../../../shared/ui';
import '../../../features/google-auth/ui/google-auth-page.css';

export function LoginPage() {
  const isOAuthReady = Boolean(googleOAuthClientId);

  return (
    <main className="login-page">
      <section className="login-page__panel">
        <span className="login-page__badge">Google OAuth</span>

        <div className="login-page__hero">
          <h1>SpotLog</h1>
          <p>Google 계정으로 로그인하고 위치 메모 기능을 시작하는 기본 로그인 화면입니다.</p>
        </div>

        <div className="login-page__features">
          <article className="login-page__feature">
            <strong>Authorization Code Flow</strong>
            <span>프론트 redirect URI에서 code를 받고 백엔드 API로 교환합니다.</span>
          </article>
          <article className="login-page__feature">
            <strong>Backend Token Exchange</strong>
            <span>토큰 발급과 사용자 생성은 백엔드가 처리하고 프론트는 결과만 받습니다.</span>
          </article>
          <article className="login-page__feature">
            <strong>Actual App Entry</strong>
            <span>실제 앱 진입 전에 사용하는 기본 인증 페이지입니다.</span>
          </article>
        </div>

        <div className="login-page__action">
          <SocialLoginButton
            onClick={() => redirectToGoogleAuthorization({ prompt: 'consent' })}
            disabled={!isOAuthReady}
          />
        </div>

        {!isOAuthReady ? (
          <div className="login-page__helper is-error">
            <>
              <strong>설정 필요</strong>
              <span>
                <code>VITE_GOOGLE_CLIENT_ID</code>가 비어 있습니다. `.env`에 값을 넣어야 로그인 버튼이
                동작합니다.
              </span>
            </>
          </div>
        ) : null}
      </section>
    </main>
  );
}
