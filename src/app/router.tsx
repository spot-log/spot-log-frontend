import { Navigate, Route, Routes } from 'react-router-dom';
import { readAuthSession } from '../features/google-auth';
import { GoogleCallbackPage } from '../pages/google-callback';
import { LoginPage } from '../pages/login';
import { MapPage } from '../pages/map';
import { MyMemosPage } from '../pages/my-memos';
import { NearbyPage } from '../pages/nearby';
import { SettingsPage } from '../pages/settings';
import { AppShell } from '../widgets/app-shell';

function ProtectedAppShell() {
  return readAuthSession() ? <AppShell /> : <Navigate to="/login" replace />;
}

function LoginRoute() {
  return readAuthSession() ? <Navigate to="/map" replace /> : <LoginPage />;
}

function FallbackRoute() {
  return <Navigate to={readAuthSession() ? '/map' : '/login'} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedAppShell />}>
        <Route index element={<Navigate to="/map" replace />} />
        <Route path="map" element={<MapPage />} />
        <Route path="nearby" element={<NearbyPage />} />
        <Route path="my-memos" element={<MyMemosPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="*" element={<FallbackRoute />} />
    </Routes>
  );
}
