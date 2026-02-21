import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

function CreateMission() {
  const navigate = useNavigate();
  const location = useLocation();
  const suggestedDomain = location.state?.domain;

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: suggestedDomain 
        ? `I see you're interested in ${suggestedDomain.replace('_', ' ')} services. Tell me what you need help with, and I'll create a step-by-step mission for you.`
        : 'Hello! 👋 I\'m your Mission Guide. Tell me what government service you need help with, and I\'ll create a personalized step-by-step guide for you.',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [state, setState] = useState('');
  const [showStateSelector, setShowStateSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
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

  const quickSuggestions = [
    { text: 'Update Aadhaar address', icon: '📇' },
    { text: 'Apply for new PAN card', icon: '💳' },
    { text: 'Renew driving license', icon: '🚗' },
    { text: 'Download e-Aadhaar', icon: '📄' }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      addMessage('assistant', '⚠️ Unable to access microphone. Please check your permissions and try typing instead.');
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
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'en');

      const response = await api.post('/api/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setInputMessage(response.data.text);
    } catch (error) {
      addMessage('assistant', '⚠️ Voice transcription failed. Please try typing your message.');
    }
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage = inputMessage.trim();
    addMessage('user', userMessage);
    setInputMessage('');

    // Check if we need state
    if (!state) {
      setShowStateSelector(true);
      addMessage('assistant', '📍 Which state are you in? This helps me provide accurate information based on your location.');
      return;
    }

    // Process the mission
    setIsLoading(true);
    addMessage('assistant', '🔍 Analyzing your request and finding the best solution...');

    try {
      const response = await api.post('/api/missions/create', {
        user_input: userMessage,
        state: state,
        previous_context: suggestedDomain ? `Domain preference: ${suggestedDomain}` : ''
      });

      // Success message
      addMessage('assistant', `✅ Great! I've created your mission: "${response.data.title}"\n\n📋 ${response.data.briefing}\n\n⏱️ Estimated time: ${response.data.estimated_completion_time}\n\nClick "View Mission Timeline" below to get started!`);
      
      // Show view mission button
      setMessages(prev => [...prev, { 
        role: 'action', 
        missionId: response.data.mission_id,
        timestamp: new Date() 
      }]);

    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Something went wrong. Please try again.';
      addMessage('assistant', `❌ ${errorMsg}\n\nWould you like to try describing your need differently?`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStateSelect = (selectedState) => {
    setState(selectedState);
    setShowStateSelector(false);
    addMessage('user', selectedState);
    addMessage('assistant', `Perfect! Now, please tell me what you need help with regarding government services.`);
  };

  const handleQuickSuggestion = (suggestion) => {
    setInputMessage(suggestion.text);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Mission Guide</h1>
            <p className="text-xs text-gray-600">AI-powered government services assistant</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">Online</span>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index}>
              {message.role === 'assistant' && (
                <div className="flex items-start gap-3 animate-fade-in">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">🤖</span>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              )}

              {message.role === 'user' && (
                <div className="flex items-start gap-3 justify-end animate-fade-in">
                  <div className="flex-1 bg-blue-600 rounded-2xl rounded-tr-none px-4 py-3 shadow-sm max-w-[80%] ml-auto">
                    <p className="text-white whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 text-sm">👤</span>
                  </div>
                </div>
              )}

              {message.role === 'action' && (
                <div className="flex justify-center my-4 animate-fade-in">
                  <button
                    onClick={() => navigate(`/mission/${message.missionId}`)}
                    className="btn-primary px-6 py-3 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                    data-testid="view-mission-btn"
                  >
                    View Mission Timeline →
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* State Selector */}
          {showStateSelector && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 animate-fade-in">
              <p className="text-sm font-semibold text-gray-700 mb-3">Select your state:</p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {states.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStateSelect(s)}
                    className="px-3 py-2 text-sm text-left bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🤖</span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Privacy Notice - Fixed at bottom of chat */}
      <div className="max-w-4xl mx-auto px-4 pb-2">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            <span className="font-semibold">🔒 Privacy:</span> Never share Aadhaar, PAN, OTP, or passwords here. I'll guide you to official portals for sensitive information.
          </p>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Quick Suggestions */}
          {messages.length === 1 && !state && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickSuggestion(suggestion)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors flex items-center gap-1"
                  >
                    <span>{suggestion.icon}</span>
                    <span>{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex items-center gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-500"
                rows={1}
                style={{ maxHeight: '120px' }}
                data-testid="chat-input"
              />
              
              {/* Voice Button */}
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`p-2 rounded-lg transition-colors ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
                title={isRecording ? 'Stop recording' : 'Use voice'}
              >
                {isRecording ? '⏹️' : '🎤'}
              </button>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="send-message-btn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreateMission;
