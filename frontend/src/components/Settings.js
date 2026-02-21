import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [preferredLanguage, setPreferredLanguage] = useState('english');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
      setPreferredLanguage(response.data.preferred_language || 'english');
      setVoiceEnabled(response.data.voice_enabled || false);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      // In a real implementation, you'd have an update user endpoint
      // For now, we'll just store in localStorage
      const updatedUser = {
        ...user,
        preferred_language: preferredLanguage,
        voice_enabled: voiceEnabled
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setMessage('Settings saved successfully!');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600">Manage your preferences</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('success') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Profile Information</h2>
          
          <div className="flex items-center gap-4 mb-6">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl text-blue-600">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Language Preferences</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Preferred Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="language-select"
              >
                <option value="english">English</option>
                <option value="hindi">Hindi (हिंदी)</option>
                <option value="tamil">Tamil (தமிழ்)</option>
                <option value="telugu">Telugu (తెలుగు)</option>
                <option value="bengali">Bengali (বাংলা)</option>
                <option value="marathi">Marathi (मराठी)</option>
                <option value="gujarati">Gujarati (ગુજરાતી)</option>
                <option value="kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="malayalam">Malayalam (മലയാളം)</option>
                <option value="punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
              </select>
              <p className="text-sm text-gray-500 mt-2">
                Mission instructions and guidance will be provided in your preferred language
              </p>
            </div>
          </div>
        </div>

        {/* Voice Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Voice Settings</h2>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-900">Voice Guidance</p>
              <p className="text-sm text-gray-600">
                Enable voice narration for mission steps and instructions
              </p>
            </div>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              data-testid="voice-toggle"
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  voiceEnabled ? 'transform translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Note:</span> Voice commands and audio narration 
              require microphone and speaker permissions. You'll be prompted when needed.
            </p>
          </div>
        </div>

        {/* Privacy & Safety */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Privacy & Safety</h2>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <p className="font-semibold text-gray-900">Data Protection</p>
                <p>We never store or request sensitive information like Aadhaar, PAN, OTPs, or passwords</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <p className="font-semibold text-gray-900">Official Sources Only</p>
                <p>All guidance is based on verified .gov.in sources</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <p className="font-semibold text-gray-900">Scam Detection</p>
                <p>Our system detects and warns you about potential fake portals and phishing attempts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full px-6 py-4 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="save-settings-btn"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
              Saving...
            </span>
          ) : (
            'Save Settings'
          )}
        </button>

        {/* About */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            Mission Platform v1.0.0 • Built for India 🇮🇳
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Privacy-first government services navigation powered by AI
          </p>
        </div>
      </main>
    </div>
  );
}

export default Settings;
