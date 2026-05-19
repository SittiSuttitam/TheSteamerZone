import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { VoicePage } from './pages/VoicePage';
import { RulesPage } from './pages/RulesPage';
import { StudioPage } from './pages/StudioPage';
import { ConnectionPage } from './pages/ConnectionPage';
import { DesignPreviewPage } from './pages/DesignPreviewPage';
import { WinWidget } from './widgets/WinWidget';
import { WheelWidget } from './widgets/WheelWidget';
import { TtsWidget } from './widgets/TtsWidget';
import { PlaceholderWidget } from './widgets/PlaceholderWidget';
import { ActivityWidget } from './widgets/ActivityWidget';
import { ChatWidget } from './widgets/ChatWidget';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/app/connection" replace />} />
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
        <Route path="studio" element={<StudioPage />} />
        <Route path="connection" element={<ConnectionPage />} />
        <Route path="design-preview" element={<DesignPreviewPage />} />
      </Route>
      <Route path="/w/:roomId/win" element={<WinWidget />} />
      <Route path="/w/:roomId/wheel" element={<WheelWidget />} />
      <Route path="/w/:roomId/tts" element={<TtsWidget />} />
      <Route path="/w/:roomId/likes" element={<PlaceholderWidget title="Likes" />} />
      <Route path="/w/:roomId/topcoin" element={<PlaceholderWidget title="Top donors" />} />
      <Route path="/w/:roomId/topviewers" element={<PlaceholderWidget title="Top viewers" />} />
      <Route path="/w/:roomId/topdonate" element={<PlaceholderWidget title="Top donate" />} />
      <Route path="/w/:roomId/image" element={<PlaceholderWidget title="Image" />} />
      <Route path="/w/:roomId/activity" element={<ActivityWidget />} />
      <Route path="/w/:roomId/chat" element={<ChatWidget />} />
      <Route
        path="/w/:roomId/leaderboard"
        element={<PlaceholderWidget title="Gift leaderboard" />}
      />
    </Routes>
  );
}
