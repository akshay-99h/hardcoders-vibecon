import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);

  useEffect(() => {
    // If user data passed from AuthCallback, skip auth check
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      fetchMissions();
      return;
    }

    // Otherwise, verify authentication
    const checkAuth = async () => {
      try {
        const response = await api.get('/api/auth/me');
        setUser(response.data);
        setIsAuthenticated(true);
        fetchMissions();
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate, location.state]);

  const fetchMissions = async () => {
    try {
      const response = await api.get('/api/missions');
      setMissions(response.data);
    } catch (error) {
      console.error('Failed to fetch missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      escalated: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getDomainIcon = (domain) => {
    const icons = {
      aadhaar: '📇',
      pan: '💳',
      driving_license: '🚗',
      passport: '🛂',
    };
    return icons[domain] || '📋';
  };

  const calculateProgress = (mission) => {
    if (!mission.steps || mission.steps.length === 0) return 0;
    const completedSteps = mission.steps.filter(s => s.status === 'completed').length;
    return Math.round((completedSteps / mission.steps.length) * 100);
  };

  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mission Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="settings-btn"
            >
              ⚙️
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="logout-btn"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/create-mission')}
            className="btn-primary w-full sm:w-auto px-8 py-4 text-white rounded-lg font-semibold text-lg shadow-lg"
            data-testid="create-mission-btn"
          >
            + Start New Mission
          </button>
        </div>

        {/* Mission Domains Quick Access */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/create-mission', { state: { domain: 'aadhaar' } })}
            className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📇</span>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">Aadhaar Services</h3>
                <p className="text-sm text-gray-600">Update, download, status</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/create-mission', { state: { domain: 'pan' } })}
            className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">💳</span>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-600">PAN Card Services</h3>
                <p className="text-sm text-gray-600">Apply, correct, reprint</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/create-mission', { state: { domain: 'driving_license' } })}
            className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚗</span>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">Driving License</h3>
                <p className="text-sm text-gray-600">Apply, renew, duplicate</p>
              </div>
            </div>
          </button>
        </div>

        {/* Missions List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Missions</h2>

          {missions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No missions yet</h3>
              <p className="text-gray-600 mb-6">Start your first mission to get AI-powered guidance</p>
              <button
                onClick={() => navigate('/create-mission')}
                className="btn-primary px-6 py-3 text-white rounded-lg font-semibold"
              >
                Create Your First Mission
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {missions.map((mission) => (
                <div
                  key={mission.mission_id}
                  onClick={() => navigate(`/mission/${mission.mission_id}`)}
                  className="mission-card bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:border-blue-400"
                  data-testid={`mission-card-${mission.mission_id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{getDomainIcon(mission.domain)}</div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{mission.title}</h3>
                        <p className="text-gray-600 text-sm">{mission.objective}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`status-badge ${getStatusColor(mission.status)}`}>
                            {mission.status.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            📍 {mission.state}
                          </span>
                          <span className="text-sm text-gray-500">
                            ⏱️ {mission.estimated_completion_time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {calculateProgress(mission)}%
                      </div>
                      <p className="text-sm text-gray-500">Progress</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${calculateProgress(mission)}%` }}
                    />
                  </div>

                  {/* Step Summary */}
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="text-gray-600">
                      {mission.steps.filter(s => s.status === 'completed').length} of {mission.steps.length} steps completed
                    </div>
                    <div className="text-blue-600 font-semibold">
                      View Details →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
