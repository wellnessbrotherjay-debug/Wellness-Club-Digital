

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import VoucherPage from './VoucherPage';
import GuestPass from './GuestPass';
import HelpSection from './HelpSection';
import AdminAnalytics from './pages/AdminAnalytics';
import { LanguageProvider } from './contexts/LanguageContext';
import { VoucherProvider } from './contexts/VoucherContext';

function App() {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <VoucherProvider>
          <Router>
            <Routes>
              <Route path="/v/:id" element={<GuestPass />} />
              <Route path="/help" element={<HelpSection />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/" element={<VoucherPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </VoucherProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
}

export default App;
