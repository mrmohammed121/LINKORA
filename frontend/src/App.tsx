import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsOverviewPage } from './pages/AnalyticsOverviewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuthPage } from './pages/AuthPage';
import { CreateLinkPage } from './pages/CreateLinkPage';
import { DashboardPage } from './pages/DashboardPage';
import { LinkManagementPage } from './pages/LinkManagementPage';
import { MyLinksPage } from './pages/MyLinksPage';
import { QrCodesPage } from './pages/QrCodesPage';
import { RescueFallbackPage } from './pages/RescueFallbackPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const applyTheme = useAuthStore((s) => s.applyTheme);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/rescue/:slug" element={<RescueFallbackPage />} />

        <Route path="/create" element={<CreateLinkPage />} />
        <Route path="/links" element={<MyLinksPage />} />
        <Route path="/qr-codes" element={<QrCodesPage />} />
        <Route path="/analytics" element={<AnalyticsOverviewPage />} />
        <Route path="/analytics/:id" element={<AnalyticsPage />} />
        <Route path="/manage" element={<LinkManagementPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
