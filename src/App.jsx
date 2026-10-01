import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import BrowserSupportBanner from './components/common/BrowserSupportBanner';
import HomePage from './pages/HomePage';
import ListeningListPage from './pages/ListeningListPage';
import ListeningSessionPage from './pages/ListeningSessionPage';
import DialogListPage from './pages/DialogListPage';
import DialogSessionPage from './pages/DialogSessionPage';
import DashboardPage from './pages/DashboardPage';
import SpeechTestPage from './pages/SpeechTestPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <BrowserSupportBanner />
        <Navbar />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listening" element={<ListeningListPage />} />
            <Route path="/listening/:id" element={<ListeningSessionPage />} />
            <Route path="/dialogs" element={<DialogListPage />} />
            <Route path="/dialogs/:id" element={<DialogSessionPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/speech-test" element={<SpeechTestPage />} />
          </Routes>
        </main>

        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2rem 1rem',
          background: 'var(--bg-glass)',
          marginTop: 'auto'
        }}>
          <div className="container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>FluentPrep</strong> — English Placement Verbal Practice App
              <div>100% In-Browser • Zero Backend • No Paid APIs • Client-Side Speech Evaluation</div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <span>Chrome / Edge recommended</span>
              <span>Web Speech API</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
