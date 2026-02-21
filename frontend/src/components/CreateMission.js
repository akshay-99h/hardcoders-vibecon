import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

function CreateMission() {
  const navigate = useNavigate();
  const location = useLocation();
  const suggestedDomain = location.state?.domain;

  const [userInput, setUserInput] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Puducherry', 'Jammu and Kashmir', 'Ladakh'
  ];

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'en');

      const response = await api.post('/api/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUserInput(prev => prev + ' ' + response.data.text);
    } catch (error) {
      console.error('Transcription error:', error);
      setError('Failed to transcribe audio. Please try typing instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userInput.trim()) {
      setError('Please describe what you need help with');
      return;
    }

    if (!state) {
      setError('Please select your state');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/missions/create', {
        user_input: userInput,
        state: state,
        previous_context: suggestedDomain ? `Domain preference: ${suggestedDomain}` : ''
      });

      // Navigate to mission detail
      navigate(`/mission/${response.data.mission_id}`);
    } catch (error) {
      console.error('Mission creation error:', error);
      setError(error.response?.data?.detail || 'Failed to create mission. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-xl font-bold text-gray-900">Create New Mission</h1>
            <p className="text-sm text-gray-600">Describe what you need help with</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8">
          {/* Suggested Domain */}
          {suggestedDomain && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Suggested domain:</span>{' '}
                {suggestedDomain.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-yellow-900 mb-1">Privacy Notice</p>
                <p className="text-sm text-yellow-800">
                  Do NOT share sensitive information like Aadhaar numbers, PAN numbers, OTPs, 
                  passwords, or bank details here. We'll guide you to official portals where 
                  you can enter this information securely.
                </p>
              </div>
            </div>
          </div>

          {/* User Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              What do you need help with? *
            </label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Example: I need to update my address in Aadhaar"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              data-testid="mission-input"
            />
            
            {/* Voice Input */}
            <div className="mt-3 flex items-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  data-testid="start-recording-btn"
                >
                  <span>🎤</span>
                  <span className="text-sm font-semibold">Use Voice</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors voice-recording"
                  data-testid="stop-recording-btn"
                >
                  <span>⏹️</span>
                  <span className="text-sm font-semibold">Stop Recording</span>
                </button>
              )}
              <p className="text-sm text-gray-500">
                {isRecording ? 'Recording... Click stop when done' : 'Click to record your request'}
              </p>
            </div>
          </div>

          {/* State Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your State *
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="state-select"
            >
              <option value="">Select your state</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Different states may have different procedures
            </p>
          </div>

          {/* Examples */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-2">Example requests:</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setUserInput('I need to update my mobile number in Aadhaar')}
                className="block w-full text-left px-4 py-2 bg-gray-50 text-sm text-gray-700 rounded hover:bg-gray-100 transition-colors"
              >
                💡 I need to update my mobile number in Aadhaar
              </button>
              <button
                type="button"
                onClick={() => setUserInput('I want to apply for a new PAN card')}
                className="block w-full text-left px-4 py-2 bg-gray-50 text-sm text-gray-700 rounded hover:bg-gray-100 transition-colors"
              >
                💡 I want to apply for a new PAN card
              </button>
              <button
                type="button"
                onClick={() => setUserInput('I need to renew my driving license')}
                className="block w-full text-left px-4 py-2 bg-gray-50 text-sm text-gray-700 rounded hover:bg-gray-100 transition-colors"
              >
                💡 I need to renew my driving license
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !userInput.trim() || !state}
            className="btn-primary w-full px-6 py-4 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="create-mission-submit-btn"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                Creating Mission...
              </span>
            ) : (
              'Create Mission'
            )}
          </button>
        </form>

        {/* Info Section */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span>1️⃣</span>
              <span>Our AI analyzes your request and identifies the exact service you need</span>
            </li>
            <li className="flex items-start gap-2">
              <span>2️⃣</span>
              <span>We verify official government sources and create a step-by-step timeline</span>
            </li>
            <li className="flex items-start gap-2">
              <span>3️⃣</span>
              <span>You get a mission briefing with estimated time, documents needed, and safety warnings</span>
            </li>
            <li className="flex items-start gap-2">
              <span>4️⃣</span>
              <span>Follow the timeline and complete your mission with our guidance</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default CreateMission;
