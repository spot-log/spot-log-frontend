import { redirectToGoogleAuthorization } from '../../../features/google-auth';
import { googleOAuthClientId } from '../../../shared/config';
import { SocialLoginButton } from '../../../shared/ui';
import '../../../features/google-auth/ui/google-auth-page.css';

export function LoginPage() {
  const isOAuthReady = Boolean(googleOAuthClientId);

  return (
    <main className="login-page">
      <section className="login-page__panel">
        <span className="login-page__badge">SpotLog Login</span>

        <div className="login-page__hero">
          <h1>SpotLog</h1>
          <p>지금 있는 위치를 기록하고, 다시 지나갈 때 필요한 메모를 남겨두세요.</p>
        </div>

        <div className="login-page__features">
          <article className="login-page__feature">
            <strong>현재 위치 기반 메모</strong>
            <span>내 위치를 바로 불러와서 메모를 남기고 지도에서 다시 확인할 수 있습니다.</span>
          </article>
          <article className="login-page__feature">
            <strong>공개 메모 탐색</strong>
            <span>주변 공개 메모를 살펴보고 필요한 메모는 북마크해서 따로 관리할 수 있습니다.</span>
          </article>
          <article className="login-page__feature">
            <strong>다시 들어오면 알림</strong>
            <span>설정한 반경에 다시 들어오면 메모를 놓치지 않도록 브라우저 알림으로 알려줍니다.</span>
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
