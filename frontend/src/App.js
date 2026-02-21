import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// Import components
import LandingPage from './components/LandingPage';
import AuthCallback from './components/AuthCallback';
import Dashboard from './components/Dashboard';
import MissionDetail from './components/MissionDetail';
import CreateMission from './components/CreateMission';
import Settings from './components/Settings';

function AppRouter() {
  const location = useLocation();
  
  // CRITICAL: Check URL fragment for session_id synchronously during render
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/mission/:missionId" element={<MissionDetail />} />
      <Route path="/create-mission" element={<CreateMission />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRouter />
    </Router>
  );
}

export default App;
