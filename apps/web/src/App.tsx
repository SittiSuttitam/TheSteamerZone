import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { VoicePage } from './pages/VoicePage';
import { RulesPage } from './pages/RulesPage';
import { StudioPage } from './pages/StudioPage';
import { WidgetsPage } from './pages/WidgetsPage';
import { ConnectionPage } from './pages/ConnectionPage';
import { ImagesConfigPage } from './pages/ImagesConfigPage';
import { ImageWidget } from './widgets/ImageWidget';
import { WinWidget } from './widgets/WinWidget';
import { WheelWidget } from './widgets/WheelWidget';
import { TtsWidget } from './widgets/TtsWidget';
import { TopDonateWidget } from './widgets/TopDonateWidget';
import { TopCoinWidget } from './widgets/TopCoinWidget';
import { TopViewersWidget } from './widgets/TopViewersWidget';
import { LikesWidget } from './widgets/LikesWidget';
import { ActivityWidget } from './widgets/ActivityWidget';
import { ChatWidget } from './widgets/ChatWidget';
import { SoundWidget } from './widgets/SoundWidget';

function HomeRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/app/connection${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="connection" replace />} />
        <Route path="voice" element={<VoicePage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="widgets" element={<WidgetsPage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="connection" element={<ConnectionPage />} />
        <Route path="images" element={<ImagesConfigPage />} />
        <Route path="design-preview" element={<Navigate to="/app/images" replace />} />
      </Route>
      <Route path="/w/:roomId/win" element={<WinWidget />} />
      <Route path="/w/:roomId/wheel" element={<WheelWidget />} />
      <Route path="/w/:roomId/tts" element={<TtsWidget />} />
      <Route path="/w/:roomId/likes" element={<LikesWidget />} />
      <Route path="/w/:roomId/topcoin" element={<TopCoinWidget />} />
      <Route path="/w/:roomId/topviewers" element={<TopViewersWidget />} />
      <Route path="/w/:roomId/topdonate" element={<TopDonateWidget />} />
      <Route path="/w/:roomId/image" element={<ImageWidget />} />
      <Route path="/w/:roomId/activity" element={<ActivityWidget />} />
      <Route path="/w/:roomId/chat" element={<ChatWidget />} />
      <Route path="/w/:roomId/sound" element={<SoundWidget />} />
      <Route path="/w/:roomId/leaderboard" element={<TopDonateWidget />} />
    </Routes>
  );
}
