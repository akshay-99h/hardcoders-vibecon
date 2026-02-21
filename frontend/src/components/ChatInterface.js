import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  HiPlus, HiTrash, HiMenu, HiSun, HiMoon,
  HiPaperClip, HiMicrophone, HiPaperAirplane,
  HiChatAlt2, HiLogout, HiVolumeUp, HiClipboardCopy, HiCheck
} from 'react-icons/hi';
import api from '../utils/api';

function ChatInterface() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Language for STT
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAuthCallback = async () => {
    setIsAuthenticating(true);
    
    // Check if there's a session_id in the URL hash (OAuth callback)
    const hash = window.location.hash;
    if (hash && hash.includes('session_id')) {
      try {
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');
        
        if (sessionId) {
          console.log('Processing OAuth callback with session_id');
          
          // Exchange session_id for session_token
          const response = await api.post('/api/auth/session', {
            session_id: sessionId,
          });
          
          const userData = response.data;
          setUser(userData);
          
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Fetch conversations after successful auth
          await fetchConversations();
          setIsAuthenticating(false);
          console.log('Authentication successful');
          return;
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setIsAuthenticating(false);
        navigate('/');
        return;
      }
    }
    
    // If no session_id in URL, check existing auth
    await checkAuth();
    setIsAuthenticating(false);
  };

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
      await fetchConversations();
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/');
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const response = await api.get(`/api/conversations/${conversationId}`);
      setMessages(response.data.messages);
      setCurrentConversation(conversationId);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

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
      console.error('Recording error:', error);
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
      formData.append('language', selectedLanguage); // Use selected language

      const response = await api.post('/api/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setInputMessage(response.data.text);
    } catch (error) {
      console.error('Transcription error:', error);
    }
  };

  const handleSendMessage = async () => {
    // If file is selected, do document analysis instead
    if (selectedFile) {
      await handleDocumentAnalysis();
      return;
    }
    
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    
    // Optimistically add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);
    
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/api/chat', {
        message: userMessage,
        conversationId: currentConversation,
        includeContext: true
      });

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString()
      }]);

      // Update current conversation ID if new
      if (!currentConversation) {
        setCurrentConversation(response.data.conversationId);
        fetchConversations(); // Refresh sidebar
      }

    } catch (error) {
      console.error('Chat error:', error);
      // Remove optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/conversations/${conversationId}`);
      if (currentConversation === conversationId) {
        handleNewChat();
      }
      fetchConversations();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      navigate('/');
    } catch (error) {
      navigate('/');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid image (JPEG, PNG, WEBP) or PDF file');
        return;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleDocumentAnalysis = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setIsLoading(true);
    
    try {
      // Add a system message indicating analysis is in progress
      const userMsg = {
        role: 'user',
        content: `📄 Analyzing document: ${selectedFile.name}...`,
        timestamp: new Date().toISOString(),
        isDocument: true
      };
      setMessages(prev => [...prev, userMsg]);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (inputMessage.trim()) {
        formData.append('query', inputMessage.trim());
      }
      // Pass current conversation ID so follow-up questions work
      if (currentConversation) {
        formData.append('conversation_id', currentConversation);
      }
      
      // Call analysis API
      const response = await api.post('/api/documents/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update conversation ID if this was a new conversation
      if (response.data.conversation_id && !currentConversation) {
        setCurrentConversation(response.data.conversation_id);
        fetchConversations(); // Refresh sidebar
      }
      
      // Add AI analysis response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.analysis,
        timestamp: new Date().toISOString(),
        isDocumentAnalysis: true
      }]);
      
      // Clear file and input
      setSelectedFile(null);
      setInputMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Document analysis error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to analyze document. Please ensure the image is clear and try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsAnalyzing(false);
      setIsLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show loading screen while authenticating
  if (isAuthenticating) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-card border-r border-border flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden h-full`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <HiPlus size={20} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversations List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {conversations.map((conv) => (
            <button
              key={conv.conversation_id}
              onClick={() => loadConversation(conv.conversation_id)}
              className={`w-full text-left p-3 rounded-lg mb-2 hover:bg-accent transition-colors group ${
                currentConversation === conv.conversation_id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.conversation_id, e)}
                  className="opacity-0 group-hover:opacity-100 text-destructive p-1 hover:bg-destructive/10 rounded transition-all"
                >
                  <HiTrash size={16} />
                </button>
              </div>
            </button>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                {user?.name?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <HiLogout size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Chat Header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <HiMenu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">RakshaAI Chat</h1>
              <p className="text-xs text-muted-foreground">AI-powered legal & financial guidance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Selector for Voice */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs">
              <span className="text-muted-foreground">Voice:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-foreground font-medium outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              {isDark ? <HiSun size={20} /> : <HiMoon size={20} />}
            </button>
          </div>
        </header>

        {/* Messages Area - Fixed Height, Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiChatAlt2 size={32} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Start a conversation</h2>
                <p className="text-muted-foreground">Ask me anything about government services</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] rounded-[1.4rem] px-5 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-card-foreground border border-border'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-card-foreground prose-strong:text-foreground prose-ul:text-card-foreground prose-ol:text-card-foreground prose-li:text-card-foreground prose-code:text-card-foreground prose-pre:bg-muted prose-pre:text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-card rounded-[1.4rem] px-5 py-3 border border-border">
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

        {/* Input Area - Fixed at Bottom */}
        <div className="bg-card border-t border-border p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            {/* File Preview */}
            {selectedFile && (
              <div className="mb-3 p-3 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                    <HiPaperClip className="text-primary" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready to analyze
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Remove file"
                >
                  <HiTrash size={18} />
                </button>
              </div>
            )}
            
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex-shrink-0"
                title="Upload document (legal notice, certificate, etc.)"
              >
                <HiPaperClip size={20} />
              </button>

              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`p-3 transition-colors rounded-lg flex-shrink-0 ${
                  isRecording
                    ? 'bg-destructive text-destructive-foreground animate-pulse'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                title="Voice input"
              >
                <HiMicrophone size={20} />
              </button>

              <div className="flex-1 bg-input rounded-[1.4rem] px-5 py-3 flex items-center border border-border focus-within:ring-2 focus-within:ring-ring transition-all">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedFile ? "Add a question about the document (optional)..." : "Type your message..."}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground"
                  rows={1}
                  style={{ maxHeight: '120px' }}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={(!inputMessage.trim() && !selectedFile) || isLoading}
                className="p-3 bg-primary text-primary-foreground rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                title={selectedFile ? "Analyze document" : "Send message"}
              >
                {isAnalyzing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiPaperAirplane size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
