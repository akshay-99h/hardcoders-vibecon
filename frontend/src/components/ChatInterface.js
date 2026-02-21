import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  HiPlus, HiTrash, HiMenu, HiSun, HiMoon,
  HiPaperClip, HiMicrophone, HiPaperAirplane,
  HiChatAlt2, HiLogout, HiVolumeUp, HiClipboardCopy, HiCheck, HiPhone
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
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isInVoiceMode, setIsInVoiceMode] = useState(false);
  const [voiceCallId, setVoiceCallId] = useState(null);
  const [voiceState, setVoiceState] = useState('idle'); // idle, listening, thinking, speaking
  const [voiceVolume, setVoiceVolume] = useState(0); // Track mic volume for visual feedback
  const [isUserSpeaking, setIsUserSpeaking] = useState(false); // Track if user is actively speaking
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const isInVoiceModeRef = useRef(false); // Track voice mode for callbacks

  useEffect(() => {
    handleAuthCallback();
    
    // Cleanup speech synthesis and voice mode on unmount
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      // Cleanup voice mode if active
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
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

  // ============== CHATGPT-STYLE VOICE CONVERSATION ==============
  
  const startVoiceConversation = async () => {
    try {
      // Start AI call session
      const response = await api.post('/api/ai-call/start', {
        conversation_id: currentConversation,
        language: selectedLanguage
      });
      
      setVoiceCallId(response.data.call_id);
      setIsInVoiceMode(true);
      isInVoiceModeRef.current = true; // Update ref for callbacks
      setVoiceState('listening');
      
      // Start listening immediately
      await startVoiceListening();
    } catch (error) {
      console.error('Failed to start voice conversation:', error);
      alert('Failed to start voice conversation. Please try again.');
    }
  };
  
  const startVoiceListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      streamRef.current = stream;
      
      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Enhanced Voice Activity Detection (VAD)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      audioStreamSource.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStart = null;
      let speechDetected = false;
      let consecutiveSilenceFrames = 0;
      
      // Very forgiving thresholds - allows natural speech pauses
      const SPEECH_THRESHOLD = 15; // Higher threshold
      const SILENCE_FRAMES_NEEDED = 180; // ~5-6 seconds at 60fps (very forgiving)
      const MIN_SPEECH_FRAMES = 30; // Minimum frames of speech before considering silence
      let speechFrames = 0;
      
      const detectSound = () => {
        if (!isInVoiceModeRef.current || !mediaRecorder || mediaRecorder.state !== 'recording') {
          if (audioContext.state !== 'closed') {
            audioContext.close();
          }
          return;
        }
        
        analyser.getByteTimeDomainData(dataArray);
        
        // Calculate RMS (Root Mean Square) for more accurate volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / bufferLength);
        const volume = rms * 100;
        
        // Update volume indicator for visual feedback
        setVoiceVolume(Math.min(100, volume * 3)); // Amplify for visibility
        
        // Detect speech
        if (volume > SPEECH_THRESHOLD) {
          speechFrames++;
          consecutiveSilenceFrames = 0;
          
          if (!speechDetected && speechFrames > MIN_SPEECH_FRAMES) {
            speechDetected = true;
            setIsUserSpeaking(true); // Show "Speaking..." in UI
            console.log('🎤 Speech detected, monitoring for end...');
          }
          
          silenceStart = null;
        } else if (speechDetected) {
          // We've detected speech before, now checking for silence
          consecutiveSilenceFrames++;
          
          if (consecutiveSilenceFrames >= SILENCE_FRAMES_NEEDED) {
            setIsUserSpeaking(false); // Hide "Speaking..."
            console.log('🔇 Silence detected after speech - auto-sending');
            if (audioContext.state !== 'closed') {
              audioContext.close();
            }
            stopVoiceListening();
            return;
          }
        }
        
        // Continue monitoring
        requestAnimationFrame(detectSound);
      };
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Cleanup audio context
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
        
        if (!isInVoiceModeRef.current) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Check if audio has actual speech (not just noise)
        // Minimum size check - at least 10KB for meaningful speech
        if (audioBlob.size < 10000) {
          console.log('Audio too small (likely just noise), restarting...');
          setVoiceState('listening');
          await startVoiceListening();
          return;
        }
        
        // Check if we detected actual speech during recording
        if (!speechDetected || speechFrames < MIN_SPEECH_FRAMES) {
          console.log('No meaningful speech detected, restarting...');
          setVoiceState('listening');
          await startVoiceListening();
          return;
        }
        
        await processVoiceTurn(audioBlob);
      };
      
      // Start recording with timeslice for better data capture
      mediaRecorder.start(100);
      setVoiceState('listening');
      
      // Start VAD monitoring
      requestAnimationFrame(detectSound);
      
      // Safety fallback - if no activity detected in 15 seconds, auto-send
      setTimeout(() => {
        if (mediaRecorder.state === 'recording' && isInVoiceModeRef.current) {
          if (speechDetected) {
            console.log('⏱️ Auto-sending after 15 seconds');
            stopVoiceListening();
          }
        }
      }, 15000);
      
    } catch (error) {
      console.error('Failed to start voice listening:', error);
      alert(`Microphone error: ${error.message}`);
      endVoiceConversation();
    }
  };
  
  const stopVoiceListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };
  
  const processVoiceTurn = async (audioBlob) => {
    setVoiceState('thinking');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      
      const response = await api.post(`/api/ai-call/turn?call_id=${voiceCallId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { transcribed_text, response_text } = response.data;
      
      // ✅ Show BOTH messages together in a single state update
      const userMessage = {
        role: 'user',
        content: transcribed_text,
        timestamp: new Date().toISOString(),
        fromVoice: true
      };
      
      const aiMessage = {
        role: 'assistant',
        content: response_text,
        timestamp: new Date().toISOString(),
        fromVoice: true
      };
      
      // Add both messages at once
      setMessages(prev => [...prev, userMessage, aiMessage]);
      
      // Update conversation ID if this was a new conversation
      if (!currentConversation && response.data.conversation_id) {
        setCurrentConversation(response.data.conversation_id);
        fetchConversations();
      }
      
      // Play AI response using BROWSER TEXT-TO-SPEECH (no API call)
      setVoiceState('speaking');
      
      // Clean text for better speech
      let cleanText = response_text;
      // Remove emojis
      cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
      cleanText = cleanText.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
      cleanText = cleanText.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
      cleanText = cleanText.replace(/[\u{1F700}-\u{1F77F}]/gu, '');
      cleanText = cleanText.replace(/[\u{1F780}-\u{1F7FF}]/gu, '');
      cleanText = cleanText.replace(/[\u{1F800}-\u{1F8FF}]/gu, '');
      cleanText = cleanText.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
      cleanText = cleanText.replace(/[\u{1FA00}-\u{1FA6F}]/gu, '');
      cleanText = cleanText.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');
      cleanText = cleanText.replace(/[\u{2600}-\u{26FF}]/gu, '');
      cleanText = cleanText.replace(/[\u{2700}-\u{27BF}]/gu, '');
      
      // Use browser's native speech synthesis
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Load voices (may not be immediately available)
      let voices = window.speechSynthesis.getVoices();
      
      // If voices not loaded, wait for them
      if (voices.length === 0) {
        await new Promise(resolve => {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve();
          };
        });
      }
      
      // Try to get a good female voice (prefer Google voices if available)
      const femaleVoice = voices.find(voice => 
        (voice.name.includes('Google') && (voice.name.includes('female') || voice.name.includes('US') || voice.name.includes('UK'))) ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('microsoft zira') ||
        (voice.lang.includes('hi') && voice.name.includes('Google')) // Hindi voice
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
        console.log('Using voice:', femaleVoice.name);
      }
      
      // Natural speech settings
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly higher for female voice
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        // Continue the conversation loop
        if (isInVoiceModeRef.current) {
          setVoiceState('listening');
          startVoiceListening();
        }
      };
      
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        // Continue even if speech fails
        if (isInVoiceModeRef.current) {
          setVoiceState('listening');
          startVoiceListening();
        }
      };
      
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Voice turn error:', error);
      alert(`Voice conversation error: ${error.response?.data?.detail || error.message}`);
      endVoiceConversation();
    }
  };
  
  const endVoiceConversation = async () => {
    setIsInVoiceMode(false);
    isInVoiceModeRef.current = false; // Update ref for callbacks
    setVoiceState('idle');
    setVoiceVolume(0); // Reset volume indicator
    setIsUserSpeaking(false); // Reset speaking indicator
    
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop browser speech synthesis if active
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    // Release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // End call session on backend
    if (voiceCallId) {
      try {
        await api.post('/api/ai-call/end', { call_id: voiceCallId });
      } catch (error) {
        console.error('Error ending call:', error);
      }
      setVoiceCallId(null);
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

  const handleTextToSpeech = (message) => {
    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Clean the text for better speech
    let cleanText = message.content;
    
    // Remove emojis
    cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    cleanText = cleanText.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Symbols & Pictographs
    cleanText = cleanText.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport & Map
    cleanText = cleanText.replace(/[\u{1F700}-\u{1F77F}]/gu, ''); // Alchemical
    cleanText = cleanText.replace(/[\u{1F780}-\u{1F7FF}]/gu, ''); // Geometric Shapes
    cleanText = cleanText.replace(/[\u{1F800}-\u{1F8FF}]/gu, ''); // Supplemental Arrows
    cleanText = cleanText.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols
    cleanText = cleanText.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Chess Symbols
    cleanText = cleanText.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Symbols and Pictographs Extended-A
    cleanText = cleanText.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Miscellaneous Symbols
    cleanText = cleanText.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
    cleanText = cleanText.replace(/[\u{FE00}-\u{FE0F}]/gu, '');   // Variation Selectors
    cleanText = cleanText.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
    
    // Remove markdown formatting
    cleanText = cleanText.replace(/(\*\*|__)(.*?)\1/g, '$2'); // Bold
    cleanText = cleanText.replace(/(\*|_)(.*?)\1/g, '$2');     // Italic
    cleanText = cleanText.replace(/`([^`]+)`/g, '$1');         // Code
    cleanText = cleanText.replace(/^#+\s/gm, '');              // Headers
    cleanText = cleanText.replace(/^\s*[-*+]\s/gm, '');        // List bullets
    cleanText = cleanText.replace(/^\s*\d+\.\s/gm, '');        // Numbered lists
    
    // Remove multiple spaces and trim
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    if (!cleanText) return;
    
    // Check if text has exclamation marks for emphasis
    const hasEmphasis = cleanText.includes('!');
    
    // Detect language
    const isHindi = /[\u0900-\u097F]/.test(cleanText);
    
    // Split by sentences for better emphasis handling
    const sentences = cleanText.split(/([.!?]+\s+)/);
    let currentIndex = 0;
    
    const speakNextSentence = () => {
      if (currentIndex >= sentences.length) {
        setSpeakingMessageId(null);
        return;
      }
      
      const sentence = sentences[currentIndex].trim();
      if (!sentence || /^[.!?]+$/.test(sentence)) {
        currentIndex++;
        speakNextSentence();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = isHindi ? 'hi-IN' : 'en-US';
      
      // Add emphasis if sentence has exclamation mark
      if (sentence.includes('!')) {
        utterance.rate = 0.9;    // Slightly slower for emphasis
        utterance.pitch = 1.2;   // Higher pitch for excitement
        utterance.volume = 1.0;  // Maximum volume
      } else {
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
      }
      
      utterance.onend = () => {
        currentIndex++;
        speakNextSentence();
      };
      
      utterance.onerror = () => {
        setSpeakingMessageId(null);
      };
      
      window.speechSynthesis.speak(utterance);
    };
    
    // Track which message is being spoken
    setSpeakingMessageId(message.timestamp);
    speakNextSentence();
  };

  const handleCopyToClipboard = async (message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.timestamp);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
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
                <div className="flex flex-col gap-2 max-w-[85%]">
                  <div
                    className={`rounded-[1.4rem] px-5 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground border border-border'
                    }`}
                  >
                    {/* Voice indicator badge */}
                    {message.fromVoice && (
                      <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                        <HiMicrophone size={12} />
                        <span>Voice</span>
                      </div>
                    )}
                    
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
                  
                  {/* Action buttons for assistant messages */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 px-2">
                      <button
                        onClick={() => handleTextToSpeech(message)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                        title={speakingMessageId === message.timestamp ? "Stop speaking" : "Read aloud"}
                      >
                        <HiVolumeUp 
                          size={16} 
                          className={speakingMessageId === message.timestamp ? 'text-primary animate-pulse' : ''}
                        />
                      </button>
                      
                      <button
                        onClick={() => handleCopyToClipboard(message)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                        title={copiedMessageId === message.timestamp ? "Copied!" : "Copy to clipboard"}
                      >
                        {copiedMessageId === message.timestamp ? (
                          <HiCheck size={16} className="text-green-500" />
                        ) : (
                          <HiClipboardCopy size={16} />
                        )}
                      </button>
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
            
            {/* Show "Speaking..." indicator while user is actively speaking in voice mode */}
            {isInVoiceMode && isUserSpeaking && (
              <div className="flex justify-end animate-fade-in">
                <div className="bg-purple-500 text-white rounded-[1.4rem] px-5 py-3 flex items-center gap-2">
                  <HiMicrophone size={16} className="animate-pulse" />
                  <span className="text-sm">Speaking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="bg-card border-t border-border p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            {/* Voice Conversation Mode UI */}
            {isInVoiceMode && (
              <div className="mb-4 p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border-2 border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        voiceState === 'listening' ? 'bg-purple-500' :
                        voiceState === 'thinking' ? 'bg-yellow-500' :
                        voiceState === 'speaking' ? 'bg-blue-500' : 'bg-gray-500'
                      }`}>
                        {voiceState === 'listening' && (
                          <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-75"></div>
                        )}
                        {voiceState === 'speaking' && (
                          <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                        <HiMicrophone className="text-white relative z-10" size={32} />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {voiceState === 'listening' && 'Listening...'}
                        {voiceState === 'thinking' && 'Processing...'}
                        {voiceState === 'speaking' && 'RakshaAI is speaking...'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {voiceState === 'listening' && 'Speak naturally - I\'ll detect when you\'re done'}
                        {voiceState === 'thinking' && 'Analyzing your question...'}
                        {voiceState === 'speaking' && 'Listen to the response...'}
                      </p>
                      {/* Volume indicator */}
                      {voiceState === 'listening' && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all duration-75"
                              style={{ width: `${voiceVolume}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">
                            {voiceVolume > 8 ? '🎤' : '...'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={endVoiceConversation}
                      className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-all"
                      title="End voice conversation"
                    >
                      End Call
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* File Preview */}
            {!isInVoiceMode && selectedFile && (
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
            
            {/* Regular Input Controls (Hidden in Voice Mode) */}
            {!isInVoiceMode && (
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
                  title="Voice to text"
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
                
                {/* ChatGPT-style inline voice conversation button */}
                <button
                  onClick={startVoiceConversation}
                  className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all flex-shrink-0"
                  title="Start AI voice conversation"
                >
                  <HiPhone size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
