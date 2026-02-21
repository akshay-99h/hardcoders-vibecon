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
  const [isDark, setIsDark] = useState(false);
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
    // Apply theme on mount
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
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

    const userMessage = inputMessage.trim();
    addMessage('user', userMessage);
    setInputMessage('');

    if (!state) {
      setShowStateSelector(true);
      addMessage('assistant', '📍 Which state are you in? This helps me provide accurate information based on your location.');
      return;
    }

    setIsLoading(true);
    addMessage('assistant', '🔍 Analyzing your request and finding the best solution...');

    try {
      const response = await api.post('/api/missions/create', {
        user_input: userMessage,
        state: state,
        previous_context: suggestedDomain ? `Domain preference: ${suggestedDomain}` : ''
      });

      addMessage('assistant', `✅ Great! I've created your mission: "${response.data.title}"\n\n📋 ${response.data.briefing}\n\n⏱️ Estimated time: ${response.data.estimated_completion_time}\n\nClick "View Mission Timeline" below to get started!`);
      
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Mission Guide</h1>
            <p className="text-xs text-muted-foreground">AI-powered government services assistant</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index}>
              {message.role === 'assistant' && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[85%] bg-card text-card-foreground rounded-[1.4rem] px-5 py-3 shadow-sm border border-border">
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              )}

              {message.role === 'user' && (
                <div className="flex justify-end animate-fade-in">
                  <div className="max-w-[85%] bg-primary text-primary-foreground rounded-[1.4rem] px-5 py-3 shadow-sm">
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              )}

              {message.role === 'action' && (
                <div className="flex justify-center my-4 animate-fade-in">
                  <button
                    onClick={() => navigate(`/mission/${message.missionId}`)}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-[1.4rem] font-semibold shadow-md hover:shadow-lg transition-all"
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
            <div className="bg-card rounded-[1.4rem] p-4 shadow-sm border border-border animate-fade-in">
              <p className="text-sm font-semibold text-foreground mb-3">Select your state:</p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {states.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStateSelect(s)}
                    className="px-3 py-2 text-sm text-left bg-accent hover:bg-accent/80 text-accent-foreground rounded-lg transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-card rounded-[1.4rem] px-5 py-3 shadow-sm border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border-t border-border sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Quick Suggestions */}
          {messages.length === 1 && !state && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickSuggestion(suggestion)}
                    className="px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-full text-sm text-accent-foreground transition-colors flex items-center gap-1"
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
            {/* Attachment Button */}
            <button
              className="p-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex-shrink-0"
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Voice Button */}
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`p-3 transition-colors rounded-lg flex-shrink-0 ${
                isRecording 
                  ? 'bg-destructive text-destructive-foreground animate-pulse' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* Text Input */}
            <div className="flex-1 bg-input rounded-[1.4rem] px-5 py-3 flex items-center border border-border focus-within:ring-2 focus-within:ring-ring transition-all">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground"
                rows={1}
                style={{ maxHeight: '120px' }}
                data-testid="chat-input"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-primary text-primary-foreground rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
              data-testid="send-message-btn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreateMission;
