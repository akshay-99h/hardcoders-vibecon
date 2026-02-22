import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import HowItWorks from './components/HowItWorks';
import ProjectSlides from './components/ProjectSlides';
import SeoManager from './components/SeoManager';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import AICall from './pages/AICall';
import BillingPage from './pages/BillingPage';
import AdminConsole from './pages/AdminConsole';
import ContactUsPage from './pages/ContactUsPage';

function AppRouter() {
  return (
    <>
      <SeoManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/slides" element={<ProjectSlides />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/call" element={<AICall />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/:section" element={<BillingPage />} />
        <Route path="/billing/checkout/success" element={<BillingPage />} />
        <Route path="/billing/checkout/cancel" element={<BillingPage />} />
        <Route path="/billing/return" element={<BillingPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/admin/*" element={<AdminConsole />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <AppRouter />
      </Router>
    </LanguageProvider>
  );
}

export default App;
