import { Navigate, Route, Routes } from 'react-router-dom';
import { GoogleCallbackPage } from '../pages/google-callback';
import { LoginPage } from '../pages/login';
import { MapPage } from '../pages/map';
import { MyMemosPage } from '../pages/my-memos';
import { NearbyPage } from '../pages/nearby';
import { SettingsPage } from '../pages/settings';
import { AppShell } from '../widgets/app-shell';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/map" replace />} />
        <Route path="map" element={<MapPage />} />
        <Route path="nearby" element={<NearbyPage />} />
        <Route path="my-memos" element={<MyMemosPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  );
}
