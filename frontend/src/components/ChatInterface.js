import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Add01Icon, Delete02Icon, Menu01Icon, Sun03Icon, Moon02Icon,
  AttachmentIcon, Mic01Icon, ArrowRight01Icon,
  MessageMultiple01Icon, Logout01Icon, VolumeHighIcon, Copy01Icon, Tick02Icon, Call02Icon, Download01Icon
} from 'hugeicons-react';
import api from '../utils/api';
import { ACTION_HUB_COPY, ACTION_HUB_SCHEMA } from '../config/actionHubConfig';
import { Switch } from './ui/switch';
import { useClientEnvironment } from '../utils/clientEnvironment';

function ChatInterface() {
  const navigate = useNavigate();
  const { isMobileViewport, isStandalonePWA, isDesktopBrowser } = useClientEnvironment();
  const isCompactLayout = isMobileViewport || isStandalonePWA;

  const [user, setUser] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Language for STT
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [downloadMenuOpenFor, setDownloadMenuOpenFor] = useState(null);
  const [isRoleUpdating, setIsRoleUpdating] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [actionFormValues, setActionFormValues] = useState({});
  const [actionFormFiles, setActionFormFiles] = useState({});
  const [actionFormError, setActionFormError] = useState('');
  const [actionToast, setActionToast] = useState(null);
  const [actionFileInputVersion, setActionFileInputVersion] = useState(0);
  const [isInVoiceMode, setIsInVoiceMode] = useState(false);
  const [voiceCallId, setVoiceCallId] = useState(null);
  const [voiceState, setVoiceState] = useState('idle'); // idle, listening, thinking, speaking
  const [voiceVolume, setVoiceVolume] = useState(0); // Track mic volume for visual feedback
  const [isUserSpeaking, setIsUserSpeaking] = useState(false); // Track if user is actively speaking
  const [automationButtonStates, setAutomationButtonStates] = useState({});
  const [activeAutomationMessageId, setActiveAutomationMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const isInVoiceModeRef = useRef(false); // Track voice mode for callbacks
  const voiceCallIdRef = useRef(null);
  const currentConversationRef = useRef(null);
  const voiceVadFrameRef = useRef(null);
  const voiceListeningTimeoutRef = useRef(null);
  const voiceAudioContextRef = useRef(null);
  const isStartingVoiceListeningRef = useRef(false);
  const mobileQuickPrompts = [
    {
      title: 'Analyze legal notice',
      subtitle: 'and summarize next steps',
      prompt: 'Please analyze this legal notice and explain what I should do next in simple terms.',
    },
    {
      title: 'Draft RTI',
      subtitle: 'for local authority',
      prompt: 'Draft an RTI application to request status update from my local municipal office.',
    },
    {
      title: 'Write complaint',
      subtitle: 'with evidence checklist',
      prompt: 'Help me draft a formal complaint and include a checklist of documents to attach.',
    },
  ];

  const clearVoiceRuntimeArtifacts = () => {
    if (voiceVadFrameRef.current !== null) {
      window.cancelAnimationFrame(voiceVadFrameRef.current);
      voiceVadFrameRef.current = null;
    }

    if (voiceListeningTimeoutRef.current) {
      window.clearTimeout(voiceListeningTimeoutRef.current);
      voiceListeningTimeoutRef.current = null;
    }

    const audioContext = voiceAudioContextRef.current;
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
    voiceAudioContextRef.current = null;
  };

  useEffect(() => {
    handleAuthCallback();
    
    // Cleanup speech synthesis and voice mode on unmount
    return () => {
      const activeCallId = voiceCallIdRef.current;
      clearVoiceRuntimeArtifacts();
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      // Cleanup voice mode if active
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (activeCallId) {
        api.post('/api/ai-call/end', { call_id: activeCallId }).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    voiceCallIdRef.current = voiceCallId;
  }, [voiceCallId]);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    if (!isCompactLayout) {
      setSidebarOpen(true);
    }
  }, [isCompactLayout]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!actionToast) return undefined;
    const timeoutId = window.setTimeout(() => setActionToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [actionToast]);

  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest('[data-download-menu="true"]')) return;
      setDownloadMenuOpenFor(null);
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

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
          await fetchBillingStatus();
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
      await Promise.all([fetchConversations(), fetchBillingStatus()]);
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
      currentConversationRef.current = conversationId;
      setCurrentConversation(conversationId);
      setAutomationButtonStates({});
      setActiveAutomationMessageId(null);
      if (isCompactLayout) setSidebarOpen(false);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const fetchBillingStatus = async () => {
    try {
      const response = await api.get('/api/billing/status');
      setBillingStatus(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch billing status:', error);
      return null;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const toggleDemoAdminRole = async (forceAdmin = null) => {
    if (!user || isRoleUpdating) return;
    const nextIsAdmin = typeof forceAdmin === 'boolean'
      ? forceAdmin
      : (user.role !== 'admin' && user.role !== 'superadmin');
    setIsRoleUpdating(true);

    try {
      const response = await api.post('/api/auth/demo-role', { is_admin: nextIsAdmin });
      const nextRole = response.data?.role || (nextIsAdmin ? 'admin' : 'user');
      setUser((prev) => (prev ? { ...prev, role: nextRole } : prev));
      setBillingStatus((prev) => (prev ? { ...prev, role: nextRole } : prev));
    } catch (error) {
      console.error('Failed to toggle demo role:', error);
      alert('Failed to update role');
    } finally {
      setIsRoleUpdating(false);
    }
  };

  const actionModules = ACTION_HUB_SCHEMA.actions || [];
  const actionCopyMap = ACTION_HUB_COPY.action_copy || {};
  const commonCopy = ACTION_HUB_COPY.common_copy || {};
  const composeConfig = ACTION_HUB_SCHEMA.prompt_compose || {};
  const submitBehavior = ACTION_HUB_SCHEMA.submit_behavior || {};
  const actionMetricMap = {
    application_followup_draft: 'chat_messages',
    notice_analyzer: 'document_analysis',
    draft_rti_complaint: 'chat_messages',
    deadline_planner: 'automation_runs',
    portal_form_prep: 'chat_messages',
    fraud_signal_analyzer: 'chat_messages',
  };

  const getActionCopy = (actionId) => actionCopyMap[actionId] || {};
  const getActionMetric = (actionId) => actionMetricMap[actionId] || null;

  const getMetricLabel = (metricKey) => {
    return {
      chat_messages: 'Chat prompts',
      stt_requests: 'Voice requests',
      document_analysis: 'Document scans',
      pdf_exports: 'PDF exports',
      automation_runs: 'Automation runs',
    }[metricKey] || metricKey.replace(/_/g, ' ');
  };

  const getMetricSnapshot = (metricKey) => {
    if (!metricKey) return null;
    return billingStatus?.metrics?.[metricKey] || null;
  };

  const isMetricLocked = (metricKey) => {
    const metric = getMetricSnapshot(metricKey);
    if (!metric) return false;
    const limit = Number(metric.limit ?? 0);
    const remaining = Number(metric.remaining ?? 0);
    return limit <= 0 || remaining <= 0 || Boolean(metric.exhausted);
  };

  const isActionLocked = (action) => {
    const metricKey = getActionMetric(action.id);
    if (!metricKey) return false;
    return isMetricLocked(metricKey);
  };

  const getActionQuotaBadge = (action) => {
    const metricKey = getActionMetric(action.id);
    if (!metricKey) return null;
    const metric = getMetricSnapshot(metricKey);
    if (!metric) {
      return {
        metricLabel: getMetricLabel(metricKey),
        label: 'Checking quota...',
        className: 'bg-muted text-muted-foreground'
      };
    }

    const limit = Number(metric.limit ?? 0);
    const remaining = Number(metric.remaining ?? 0);
    if (limit <= 0) {
      return {
        metricLabel: getMetricLabel(metricKey),
        label: 'Locked on plan',
        className: 'bg-muted text-muted-foreground'
      };
    }
    if (remaining <= 0 || Boolean(metric.exhausted)) {
      return {
        metricLabel: getMetricLabel(metricKey),
        label: '0 left this month',
        className: 'bg-destructive/10 text-destructive'
      };
    }
    return {
      metricLabel: getMetricLabel(metricKey),
      label: `${remaining} left this month`,
      className: 'bg-primary/10 text-primary'
    };
  };

  const resetActionDialog = () => {
    setActiveAction(null);
    setActionFormValues({});
    setActionFormFiles({});
    setActionFormError('');
    setActionFileInputVersion((prev) => prev + 1);
  };

  const openActionDialog = (action) => {
    if (isActionLocked(action)) {
      navigate('/billing');
      return;
    }

    const defaults = {};
    (action?.dialog?.fields || []).forEach((field) => {
      if (field.default !== undefined) {
        defaults[field.id] = field.default;
      }
    });

    setActiveAction(action);
    setActionFormValues(defaults);
    setActionFormFiles({});
    setActionFormError('');
    setActionFileInputVersion((prev) => prev + 1);
  };

  const closeActionDialog = () => {
    resetActionDialog();
  };

  const updateActionFieldValue = (fieldId, value) => {
    setActionFormValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const updateActionFieldFile = (fieldId, file) => {
    setActionFormFiles((prev) => ({ ...prev, [fieldId]: file || null }));
  };

  const getActionFieldDefinition = (action, fieldId) => {
    return (action?.dialog?.fields || []).find((field) => field.id === fieldId);
  };

  const getActionFieldStringValue = (action, fieldId) => {
    const field = getActionFieldDefinition(action, fieldId);
    if (!field) return '';
    if (field.type === 'file') {
      return actionFormFiles[fieldId]?.name || '';
    }
    const raw = actionFormValues[fieldId];
    if (raw === undefined || raw === null) return '';
    return String(raw).trim();
  };

  const hasActionValue = (action, fieldId) => {
    return getActionFieldStringValue(action, fieldId).length > 0;
  };

  const validateActionForm = (action) => {
    const requiredFields = action?.validation?.required || [];
    const missingRequired = requiredFields.some((fieldId) => !hasActionValue(action, fieldId));
    if (missingRequired) {
      return commonCopy.validation_required || 'Please fill all required fields.';
    }

    const anyOfGroups = action?.validation?.any_of || [];
    for (const group of anyOfGroups) {
      const anyPresent = group.some((fieldId) => hasActionValue(action, fieldId));
      if (!anyPresent) {
        return commonCopy.validation_any_of || 'Please provide at least one of the required inputs.';
      }
    }
    return '';
  };

  const composeActionPrompt = (action) => {
    const sections = [];
    const separator = composeConfig.section_separator || '\n';
    const preface = ACTION_HUB_COPY.chat_preface_templates?.[action.id];
    if (preface) {
      sections.push(preface);
    }

    const promptSections = action?.prompt?.sections || [];
    for (const section of promptSections) {
      const placeholderMatches = [...section.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)];
      let omitLine = false;
      let rendered = section;

      for (const [, placeholderKey] of placeholderMatches) {
        const field = getActionFieldDefinition(action, placeholderKey);
        const value = getActionFieldStringValue(action, placeholderKey);
        if (!value && field?.omit_if_empty) {
          omitLine = true;
          break;
        }
        rendered = rendered.replace(new RegExp(`{{\\s*${placeholderKey}\\s*}}`, 'g'), value || 'Not provided');
      }

      if (omitLine) {
        continue;
      }
      if (placeholderMatches.length > 0 && rendered.trim() === 'Not provided' && section.trim().startsWith('{{')) {
        continue;
      }
      sections.push(rendered);
    }

    const uploadedFiles = Object.entries(actionFormFiles).filter(([, file]) => file);
    if (uploadedFiles.length > 0) {
      sections.push('');
      sections.push('Uploaded Files:');
      uploadedFiles.forEach(([, file]) => {
        sections.push(`- ${file.name}`);
      });
    }

    const responseFormatItems = action?.prompt?.response_format || [];
    if (responseFormatItems.length > 0) {
      sections.push('');
      sections.push(composeConfig.response_format_prefix || 'Response format:');
      responseFormatItems.forEach((item) => {
        sections.push(`${composeConfig.response_format_bullet_prefix || '- '}${item}`);
      });
    }

    const prompt = sections.join(separator).replace(/\n{3,}/g, '\n\n').trim();
    return prompt;
  };

  const submitActionDialog = async () => {
    if (!activeAction) return;

    const validationMessage = validateActionForm(activeAction);
    if (validationMessage) {
      setActionFormError(validationMessage);
      return;
    }

    setActionFormError('');
    const prompt = composeActionPrompt(activeAction);
    let success = true;
    if (submitBehavior.send_to_chat) {
      success = await handleSendMessage(prompt);
    }

    if (submitBehavior.close_dialog_on_submit) {
      closeActionDialog();
    }
    if (submitBehavior.reset_form_on_submit && !submitBehavior.close_dialog_on_submit) {
      setActionFormValues({});
      setActionFormFiles({});
      setActionFileInputVersion((prev) => prev + 1);
    }

    setActionToast({
      tone: success ? 'success' : 'error',
      message: success
        ? (commonCopy.toast_success || 'Structured query sent to chat.')
        : (commonCopy.toast_error || 'Could not submit this workflow. Please review your inputs.'),
    });
  };

  const extractQuotaError = (error) => {
    const detail = error?.response?.data?.detail;
    if (error?.response?.status !== 402 || !detail || typeof detail !== 'object') {
      return null;
    }
    if (detail.code !== 'PLAN_LIMIT_EXCEEDED') {
      return null;
    }
    return detail;
  };

  const handleQuotaError = async (error) => {
    const quota = extractQuotaError(error);
    if (!quota) return false;

    const metricLabel = getMetricLabel(quota.feature_key || 'usage');
    alert(`Limit reached for ${metricLabel}. Upgrade your plan to continue.`);
    await fetchBillingStatus();
    return true;
  };

  const handleStartRecording = async () => {
    if (isMetricLocked('stt_requests')) {
      navigate('/billing');
      return;
    }

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
      await fetchBillingStatus();
    } catch (error) {
      const handled = await handleQuotaError(error);
      if (handled) return;
      console.error('Transcription error:', error);
    }
  };

  // ============== CHATGPT-STYLE VOICE CONVERSATION ==============
  
  const startVoiceConversation = async () => {
    if (isMetricLocked('stt_requests')) {
      navigate('/billing');
      return;
    }

    try {
      // Start AI call session
      const response = await api.post('/api/ai-call/start', {
        conversation_id: currentConversationRef.current,
        language: selectedLanguage
      });

      const nextCallId = response.data.call_id;
      const nextConversationId = response.data.conversation_id;

      setVoiceCallId(nextCallId);
      voiceCallIdRef.current = nextCallId;

      if (!currentConversationRef.current && nextConversationId) {
        currentConversationRef.current = nextConversationId;
        setCurrentConversation(nextConversationId);
        fetchConversations();
      }
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
    if (!isInVoiceModeRef.current) return;
    if (isStartingVoiceListeningRef.current) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return;

    isStartingVoiceListeningRef.current = true;

    try {
      clearVoiceRuntimeArtifacts();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (!isInVoiceModeRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

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
      voiceAudioContextRef.current = audioContext;
      const audioStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      audioStreamSource.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let speechDetected = false;
      let consecutiveSilenceFrames = 0;
      
      // Tuned for lower turn latency while avoiding accidental sends.
      const SPEECH_THRESHOLD = 12;
      const SILENCE_FRAMES_NEEDED = 60; // ~1 second at 60fps
      const MIN_SPEECH_FRAMES = 12; // ~200ms speech floor
      let speechFrames = 0;
      
      const detectSound = () => {
        if (!isInVoiceModeRef.current || mediaRecorder.state !== 'recording') {
          clearVoiceRuntimeArtifacts();
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
          
        } else if (speechDetected) {
          // We've detected speech before, now checking for silence
          consecutiveSilenceFrames++;
          
          if (consecutiveSilenceFrames >= SILENCE_FRAMES_NEEDED) {
            setIsUserSpeaking(false); // Hide "Speaking..."
            console.log('🔇 Silence detected after speech - auto-sending');
            stopVoiceListening();
            return;
          }
        }
        
        // Continue monitoring
        voiceVadFrameRef.current = window.requestAnimationFrame(detectSound);
      };
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        clearVoiceRuntimeArtifacts();
        setVoiceVolume(0);

        // Release this stream before the next turn to avoid leaked tracks.
        stream.getTracks().forEach(track => track.stop());
        if (streamRef.current === stream) {
          streamRef.current = null;
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
      voiceVadFrameRef.current = window.requestAnimationFrame(detectSound);
      
      // Safety fallback - if no activity detected in 10 seconds, auto-send
      voiceListeningTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorder.state === 'recording' && isInVoiceModeRef.current) {
          if (speechDetected) {
            console.log('⏱️ Auto-sending after 10 seconds');
            stopVoiceListening();
          }
        }
      }, 10000);
      
    } catch (error) {
      console.error('Failed to start voice listening:', error);
      alert(`Microphone error: ${error.message}`);
      endVoiceConversation();
    } finally {
      isStartingVoiceListeningRef.current = false;
    }
  };
  
  const stopVoiceListening = () => {
    clearVoiceRuntimeArtifacts();
    setIsUserSpeaking(false);
    setVoiceVolume(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };
  
  const processVoiceTurn = async (audioBlob) => {
    const activeCallId = voiceCallIdRef.current;
    if (!activeCallId || !isInVoiceModeRef.current) {
      return;
    }

    setVoiceState('thinking');
    setIsUserSpeaking(false); // Hide "Speaking..." indicator
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      
      // Show transcribing indicator
      console.log('📤 Sending audio to backend...');
      
      const response = await api.post(`/api/ai-call/turn?call_id=${activeCallId}&include_audio=false`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { transcribed_text, response_text, no_speech } = response.data;
      if (no_speech || !transcribed_text?.trim()) {
        setVoiceState('listening');
        await fetchBillingStatus();
        if (isInVoiceModeRef.current) {
          await startVoiceListening();
        }
        return;
      }
      
      console.log('✅ Received response from backend');
      
      // Create messages
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
      
      // Show the full turn together immediately to reduce perceived latency.
      setMessages(prev => [...prev, userMessage, aiMessage]);
      
      // Update conversation ID if this was a new conversation
      if (!currentConversationRef.current && response.data.conversation_id) {
        currentConversationRef.current = response.data.conversation_id;
        setCurrentConversation(response.data.conversation_id);
        fetchConversations();
      }

      await fetchBillingStatus();
      
      // Play AI response using BROWSER TEXT-TO-SPEECH
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
      cleanText = cleanText.trim();
      if (!cleanText) {
        setVoiceState('listening');
        if (isInVoiceModeRef.current) {
          await startVoiceListening();
        }
        return;
      }
      
      // Use browser's native speech synthesis
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Use currently available voices; avoid waiting to keep turns fast.
      let voices = window.speechSynthesis.getVoices();
      
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
      utterance.rate = 1.1; // Slightly faster for better flow
      utterance.pitch = 1.1; // Slightly higher for female voice
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        // Continue the conversation loop
        if (isInVoiceModeRef.current) {
          setVoiceState('listening');
          void startVoiceListening();
        }
      };
      
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        // Continue even if speech fails
        if (isInVoiceModeRef.current) {
          setVoiceState('listening');
          void startVoiceListening();
        }
      };
      
      // Avoid queued stale utterances between turns.
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      const handled = await handleQuotaError(error);
      if (handled) {
        endVoiceConversation();
        return;
      }
      console.error('Voice turn error:', error);
      alert(`Voice conversation error: ${error.response?.data?.detail || error.message}`);
      endVoiceConversation();
    }
  };
  
  const endVoiceConversation = async () => {
    const activeCallId = voiceCallIdRef.current;

    setIsInVoiceMode(false);
    isInVoiceModeRef.current = false; // Update ref for callbacks
    clearVoiceRuntimeArtifacts();
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
    voiceCallIdRef.current = null;
    setVoiceCallId(null);
    if (activeCallId) {
      try {
        await api.post('/api/ai-call/end', { call_id: activeCallId });
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
  };

  const handleSendMessage = async (messageOverride = null) => {
    // If file is selected, do document analysis instead
    if (!messageOverride && selectedFile) {
      await handleDocumentAnalysis();
      return true;
    }
    
    const messageToSend = (messageOverride ?? inputMessage).trim();
    if (!messageToSend) return false;

    const userMessage = messageToSend;
    
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

      // Add assistant response (include machine_plan if available)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
        ...(response.data.machine_plan ? { machine_plan: response.data.machine_plan } : {})
      }]);

      // Update current conversation ID if new
      if (!currentConversation) {
        currentConversationRef.current = response.data.conversationId;
        setCurrentConversation(response.data.conversationId);
        fetchConversations(); // Refresh sidebar
      }

      await fetchBillingStatus();
      return true;

    } catch (error) {
      // Remove optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
      const handled = await handleQuotaError(error);
      if (handled) return false;
      console.error('Chat error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    currentConversationRef.current = null;
    setCurrentConversation(null);
    setMessages([]);
    setAutomationButtonStates({});
    setActiveAutomationMessageId(null);
    if (isCompactLayout) setSidebarOpen(false);
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
    if (isMetricLocked('document_analysis')) {
      navigate('/billing');
      return;
    }

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
        currentConversationRef.current = response.data.conversation_id;
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
      const handled = await handleQuotaError(error);
      if (handled) return;
      console.error('Document analysis error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to analyze document. Please ensure the image is clear and try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsAnalyzing(false);
      setIsLoading(false);
      await fetchBillingStatus();
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

    // Remove embedded media HTML/links before speaking.
    cleanText = cleanText.replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ');
    cleanText = cleanText.replace(/<\/?[^>]+>/g, ' ');
    cleanText = cleanText.replace(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s]*/gi, ' ');
    
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

  const getMessageActionId = (message, index) => {
    return String(message.timestamp || message.message_id || `msg-${index}`);
  };

  const setAutomationStateForMessage = (messageId, status, error = '') => {
    setAutomationButtonStates((prev) => ({
      ...prev,
      [messageId]: { status, error }
    }));
  };

  const getAutomationStateForMessage = (messageId) => {
    return automationButtonStates[messageId]?.status || 'idle';
  };

  const getAutomationStateLabel = (status) => {
    if (status === 'starting') return 'Starting';
    if (status === 'running') return 'Running';
    if (status === 'done') return 'Done';
    if (status === 'error') return 'Error';
    return 'Automate';
  };

  const getAutomationStateClasses = (status) => {
    if (status === 'starting' || status === 'running') {
      return 'bg-primary/10 text-primary border-primary/30';
    }
    if (status === 'done') {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    }
    if (status === 'error') {
      return 'bg-destructive/10 text-destructive border-destructive/30';
    }
    return 'text-muted-foreground hover:text-foreground hover:bg-accent border-border';
  };

  const extractMissionSteps = (content) => {
    const steps = [];
    const numberedStepRegex = /(?:^|\n)\s*\d+[.)]\s+([\s\S]*?)(?=(?:\n\s*\d+[.)]\s+)|$)/g;

    let match;
    while ((match = numberedStepRegex.exec(content)) !== null) {
      const step = match[1]
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[-*]\s+/, '')
        .trim();
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  };

  const extractGovInUrl = (content) => {
    const match = content.match(/https?:\/\/(?:[a-zA-Z0-9-]+\.)*gov\.in(?:\/[^\s)\]]*)?/i);
    if (!match) return '';
    return match[0].replace(/[.,;:!?]+$/, '');
  };

  const MAX_ASSISTANT_VIDEO_EMBEDS = 2;

  const extractYouTubeVideoId = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;

    try {
      const parsed = new URL(rawUrl.trim());
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      let videoId = '';

      if (host === 'youtu.be') {
        videoId = parsed.pathname.replace(/^\//, '').split('/')[0];
      } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
        if (parsed.pathname === '/watch') {
          videoId = parsed.searchParams.get('v') || '';
        } else if (parsed.pathname.startsWith('/embed/')) {
          videoId = parsed.pathname.split('/')[2] || '';
        } else if (parsed.pathname.startsWith('/shorts/')) {
          videoId = parsed.pathname.split('/')[2] || '';
        }
      }

      if (/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
      return null;
    } catch {
      return null;
    }
  };

  const parseAssistantVideoEmbeds = (content) => {
    if (!content || typeof content !== 'string') {
      return {
        sanitizedText: '',
        topVideos: [],
        bottomVideos: []
      };
    }

    const seenVideoIds = new Set();
    const explicitTop = [];
    const explicitBottom = [];
    const unpositioned = [];

    const addVideoCandidate = (source, title = '', placement = null) => {
      const videoId = extractYouTubeVideoId(source);
      if (!videoId || seenVideoIds.has(videoId)) return;

      seenVideoIds.add(videoId);
      const normalizedTitle = String(title || 'Related video').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Related video';
      const candidate = { videoId, title: normalizedTitle };

      if (placement === 'top') {
        explicitTop.push(candidate);
      } else if (placement === 'bottom') {
        explicitBottom.push(candidate);
      } else {
        unpositioned.push(candidate);
      }
    };

    const iframeRegex = /<iframe[\s\S]*?<\/iframe>/gi;
    const iframeMatches = content.match(iframeRegex) || [];

    iframeMatches.forEach((iframeHtml) => {
      const srcMatch = iframeHtml.match(/src=(["'])(.*?)\1/i);
      if (!srcMatch?.[2]) return;

      const titleMatch = iframeHtml.match(/title=(["'])(.*?)\1/i);
      const placementMatch = iframeHtml.match(/data-(?:placement|position)=(["'])(top|bottom)\1/i);
      addVideoCandidate(srcMatch[2], titleMatch?.[2] || '', placementMatch?.[2] || null);
    });

    let sanitizedText = content.replace(iframeRegex, '').trim();

    const markdownLinkRegex = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/gi;
    for (const match of sanitizedText.matchAll(markdownLinkRegex)) {
      addVideoCandidate(match[1], '');
    }

    const plainUrlRegex = /https?:\/\/[^\s<]+/gi;
    for (const match of sanitizedText.matchAll(plainUrlRegex)) {
      addVideoCandidate(match[0], '');
    }

    const topVideos = [];
    const bottomVideos = [];

    const addWithinLimit = (list, video) => {
      if (topVideos.length + bottomVideos.length >= MAX_ASSISTANT_VIDEO_EMBEDS) return;
      list.push(video);
    };

    explicitTop.forEach((video) => addWithinLimit(topVideos, video));
    explicitBottom.forEach((video) => addWithinLimit(bottomVideos, video));

    unpositioned.forEach((video) => {
      if (topVideos.length + bottomVideos.length >= MAX_ASSISTANT_VIDEO_EMBEDS) return;
      if (topVideos.length === 0) {
        topVideos.push(video);
      } else {
        bottomVideos.push(video);
      }
    });

    sanitizedText = sanitizedText
      .replace(/^\s*(?:[-*]\s*)?(?:https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s]*)\s*$/gim, '')
      .replace(/^\s*(?:[-*]\s*)?\[[^\]]+\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s)]+)\)\s*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      sanitizedText,
      topVideos,
      bottomVideos
    };
  };

  const renderYouTubeEmbed = (video, key) => {
    return (
      <div key={key} className="mb-3 overflow-hidden rounded-xl border border-border/80 bg-muted/20">
        <div className="border-b border-border/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          {video.title}
        </div>
        <div className="relative w-full pt-[56.25%] bg-black/70">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}`}
            title={video.title}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  };

  const normalizeAutomationStatus = (automationState) => {
    const normalizeValue = (value) => {
      const normalized = String(value || '').toLowerCase();
      if (['starting', 'running', 'queued', 'in_progress', 'processing'].includes(normalized)) return 'running';
      if (['done', 'completed', 'success', 'succeeded', 'finished'].includes(normalized)) return 'done';
      if (['error', 'failed', 'failure', 'cancelled', 'canceled'].includes(normalized)) return 'error';
      if (['idle', 'ready', 'waiting', 'not_started', 'stopped'].includes(normalized)) return 'idle';
      return 'running';
    };

    if (!automationState) return 'idle';
    if (typeof automationState === 'string') {
      return normalizeValue(automationState);
    }
    return normalizeValue(automationState.status || automationState.state || automationState.phase);
  };

  const handleAutomateMessage = async (message, messageId) => {
    if (!isDesktopBrowser) {
      setActionToast({
        tone: 'error',
        message: 'Automation extension is available only in desktop browser mode.',
      });
      return;
    }

    const currentStatus = getAutomationStateForMessage(messageId);
    if (currentStatus === 'starting' || currentStatus === 'running') {
      return;
    }

    setAutomationStateForMessage(messageId, 'starting');

    try {
      const statusResponse = await api.get('/api/automation/status');
      if (!statusResponse.data?.extension_connected) {
        setAutomationStateForMessage(messageId, 'error', 'Automation extension is not connected');
        return;
      }

      const missionId = `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const missionDescription = (message.content || '').trim().slice(0, 3000);

      // Use machine_plan if available (structured JSON from backend LLM)
      if (message.machine_plan && message.machine_plan.steps && message.machine_plan.steps.length > 0) {
        const plan = message.machine_plan;
        const portalUrl = plan.start_url || extractGovInUrl(message.content || '');
        const missionTitle = (plan.goal || 'Automation Task').slice(0, 120);

        await api.post('/api/automation/start', {
          mission_id: missionId,
          mission_title: missionTitle,
          mission_description: missionDescription,
          portal_url: portalUrl,
          mission_steps: plan.steps,
          machine_plan: plan
        });
      } else {
        // Fallback: parse human text into steps (legacy mode)
        const missionSteps = extractMissionSteps(message.content || '');
        if (missionSteps.length === 0) {
          setAutomationStateForMessage(messageId, 'error', 'No numbered steps found in this response');
          return;
        }

        const portalUrl = extractGovInUrl(message.content || '');
        const missionTitle = (missionSteps[0] || 'Automation Task').slice(0, 120);

        await api.post('/api/automation/start', {
          mission_id: missionId,
          mission_title: missionTitle,
          mission_description: missionDescription,
          portal_url: portalUrl,
          mission_steps: missionSteps
        });
      }

      setAutomationStateForMessage(messageId, 'running');
      setActiveAutomationMessageId(messageId);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : 'Failed to start automation';
      setAutomationStateForMessage(messageId, 'error', errorMessage);
      console.error('Automation start failed:', error);
    }
  };

  useEffect(() => {
    if (!isDesktopBrowser) {
      return undefined;
    }
    if (!activeAutomationMessageId) {
      return undefined;
    }

    let isCancelled = false;

    const pollAutomationStatus = async () => {
      try {
        const response = await api.get('/api/automation/status');
        if (isCancelled) {
          return;
        }

        const extensionConnected = Boolean(response.data?.extension_connected);
        const automationState = response.data?.automation_state;

        if (!extensionConnected) {
          setAutomationStateForMessage(activeAutomationMessageId, 'error', 'Automation extension disconnected');
          setActiveAutomationMessageId(null);
          return;
        }

        const normalizedStatus = normalizeAutomationStatus(automationState);
        if (normalizedStatus === 'running') {
          setAutomationStateForMessage(activeAutomationMessageId, 'running');
          return;
        }

        if (normalizedStatus === 'error') {
          const errorMessage = typeof automationState === 'object'
            ? (automationState?.error || automationState?.message || 'Automation failed')
            : 'Automation failed';
          setAutomationStateForMessage(activeAutomationMessageId, 'error', errorMessage);
          setActiveAutomationMessageId(null);
          return;
        }

        if (normalizedStatus === 'done' || normalizedStatus === 'idle') {
          setAutomationStateForMessage(activeAutomationMessageId, 'done');
          setActiveAutomationMessageId(null);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setAutomationStateForMessage(activeAutomationMessageId, 'error', 'Status check failed');
        setActiveAutomationMessageId(null);
        console.error('Automation status polling failed:', error);
      }
    };

    pollAutomationStatus();
    const intervalId = window.setInterval(pollAutomationStatus, 5000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeAutomationMessageId, isDesktopBrowser]);
  
  const handleDownloadDocument = async (message, format = 'pdf') => {
    if (isMetricLocked('pdf_exports')) {
      navigate('/billing');
      return;
    }

    try {
      setDownloadMenuOpenFor(null);

      // Extract only the document portion (remove AI explanations)
      const cleanDocument = extractDocumentOnly(message.content);
      
      if (!cleanDocument) {
        alert('Could not extract document. Please try copying the text manually.');
        return;
      }
      
      // Detect document type
      let documentType = "Document";
      const content = cleanDocument.toLowerCase();
      
      if (content.includes("rti") || content.includes("right to information")) {
        documentType = "RTI_Application";
      } else if (content.includes("complaint")) {
        documentType = "Complaint_Letter";
      } else if (content.includes("grievance")) {
        documentType = "Grievance_Text";
      } else if (content.includes("appeal")) {
        documentType = "First_Appeal_RTI";
      } else if (content.includes("subject:") && content.includes("dear")) {
        documentType = "Email_Draft";
      }
      
      const isDocx = format === 'docx';
      const endpoint = isDocx ? '/api/generate-docx' : '/api/generate-pdf';
      const extension = isDocx ? 'docx' : 'pdf';
      const contentType = isDocx
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';

      // Call document generation API
      const response = await api.post(endpoint, {
        document_type: documentType,
        document_content: cleanDocument,
        user_name: "Citizen"
      }, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${documentType}_${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      await fetchBillingStatus();
      
    } catch (err) {
      const handled = await handleQuotaError(err);
      if (handled) return;
      console.error(`Failed to generate ${format.toUpperCase()}:`, err);
      alert(`Failed to generate ${format.toUpperCase()}. Please try again.`);
    }
  };
  
  // Extract only the document portion from AI response
  const extractDocumentOnly = (text) => {
    // Common patterns that indicate document start
    const startPatterns = [
      /^To,?\s*$/m,
      /^Subject:/m,
      /^The\s+(?:Central|State)\s+Public\s+Information\s+Officer/m,
      /^Respected\s+Sir\/Madam,?$/m,
      /^Dear\s+/m,
      /^I,?\s+\[?[A-Z]/m  // "I, [Name]" pattern
    ];
    
    // Common patterns that indicate document end
    const endPatterns = [
      /^Enclosures?:/m,
      /^---+$/m,
      /^Your\s+(?:RTI|complaint|document|email)/mi,
      /^I've\s+(?:generated|created|drafted)/mi,
      /^This\s+(?:document|letter|application)/mi,
      /^Please\s+(?:print|send|file)/mi,
      /^You\s+can\s+(?:now|download)/mi,
      /^\*\*(?:Instructions?|Next\s+Steps?|Important)/mi
    ];
    
    let documentStart = -1;
    let documentEnd = text.length;
    
    // Find document start
    for (const pattern of startPatterns) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        documentStart = match.index;
        break;
      }
    }
    
    // If no start found, check if entire message is a document (starts with To, or Subject:)
    if (documentStart === -1) {
      const firstLine = text.split('\n')[0].trim();
      if (firstLine.match(/^(?:To,?|Subject:|Respected|Dear)/i)) {
        documentStart = 0;
      }
    }
    
    if (documentStart === -1) {
      return null; // Not a document
    }
    
    // Find document end (look for explanatory text after document)
    const textAfterStart = text.substring(documentStart);
    for (const pattern of endPatterns) {
      const match = textAfterStart.match(pattern);
      if (match && match.index !== undefined && match.index > 100) { // At least 100 chars in
        documentEnd = documentStart + match.index;
        break;
      }
    }
    
    // Extract document portion
    let document = text.substring(documentStart, documentEnd).trim();
    
    // Remove any trailing explanation lines
    const lines = document.split('\n');
    let lastValidLine = lines.length;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim().toLowerCase();
      
      // Stop if we hit explanatory text
      if (
        line.startsWith('your ') ||
        line.startsWith('this ') ||
        line.startsWith('please ') ||
        line.startsWith('you can') ||
        line.startsWith('i\'ve ') ||
        line.startsWith('**') ||
        line.includes('download') ||
        line.includes('ready above')
      ) {
        lastValidLine = i;
      } else if (line.length > 10) {
        // Found actual content, stop
        break;
      }
    }
    
    document = lines.slice(0, lastValidLine).join('\n').trim();
    
    return document;
  };
  
  // Check if message is a generated document
  const isGeneratedDocument = (message) => {
    if (message.role !== 'assistant') return false;
    
    const content = message.content.toLowerCase();
    const indicators = [
      'to,',
      'subject:',
      'sir/madam',
      'yours faithfully',
      'thanking you',
      'application under',
      'grievance regarding',
      'complaint regarding'
    ];

    return indicators.some(indicator => content.includes(indicator)) && content.length > 200;
  };

  const getDownloadMenuId = (message, index) => {
    return getMessageActionId(message, index);
  };

  // Show loading screen while authenticating
  if (isAuthenticating) {
    return (
      <div className="min-h-screen h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-[100dvh] bg-background flex overflow-hidden relative">
      {/* Mobile backdrop */}
      {isCompactLayout && sidebarOpen && (
        <button
          className="absolute inset-0 bg-black/30 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <div
        className={`bg-card border-r border-border flex flex-col transition-all duration-300 h-full
        ${
          isCompactLayout
            ? `fixed inset-y-0 left-0 z-40 w-72 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Add01Icon size={20} />
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
                  <Delete02Icon size={16} />
                </button>
              </div>
            </button>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-3">
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

          <div className="mt-3 space-y-1">
            <button
              onClick={() => navigate('/contact')}
              className="w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-between"
            >
              <span>Contact Us</span>
              <ArrowRight01Icon size={14} />
            </button>
            <button
              onClick={() => navigate('/billing')}
              className="w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-between"
            >
              <span>Billing & Usage</span>
              <ArrowRight01Icon size={14} />
            </button>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-between"
              >
                <span>Admin Console</span>
                <ArrowRight01Icon size={14} />
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-between"
            >
              <span>{isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
              {isDark ? <Sun03Icon size={14} /> : <Moon02Icon size={14} />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-3 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Logout01Icon size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        {/* Chat Header */}
        <header
          className={`bg-card border-b border-border flex-shrink-0 ${
            isCompactLayout
              ? 'px-3 py-2.5 grid grid-cols-[auto_1fr_auto] items-center gap-2'
              : 'px-3 sm:px-4 py-3 flex flex-wrap items-start sm:items-center justify-between gap-2'
          }`}
        >
          {isCompactLayout ? (
            <>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Toggle menu"
              >
                <Menu01Icon size={20} />
              </button>
              <div className="text-center">
                <h1 className="text-base font-semibold text-foreground">RakshaAI</h1>
                <p className="text-[11px] text-muted-foreground">Ask anything</p>
              </div>
              <button
                onClick={handleNewChat}
                className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Start new chat"
                title="New chat"
              >
                <Add01Icon size={18} />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Menu01Icon size={20} />
                </button>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-foreground truncate">RakshaAI Chat</h1>
                  <p className="hidden sm:block text-xs text-muted-foreground">AI-powered legal & financial guidance</p>
                </div>
              </div>

              <div className="flex items-center flex-wrap justify-end gap-1.5 sm:gap-2">
                {isDesktopBrowser && (
                  <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">Admin</span>
                    <Switch
                      checked={user?.role === 'admin' || user?.role === 'superadmin'}
                      onCheckedChange={toggleDemoAdminRole}
                      disabled={isRoleUpdating}
                      aria-label="Toggle admin view"
                    />
                  </div>
                )}

                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-muted text-xs">
                  <span className="hidden sm:inline text-muted-foreground">Voice:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-transparent text-foreground text-xs sm:text-sm font-medium outline-none cursor-pointer max-w-[108px] sm:max-w-none"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>

                <button
                  onClick={toggleTheme}
                  className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  {isDark ? <Sun03Icon size={20} /> : <Moon02Icon size={20} />}
                </button>
              </div>
            </>
          )}
        </header>

        {/* Messages Area - Fixed Height, Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          <div className="max-w-4xl mx-auto space-y-4">
            {actionToast && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  actionToast.tone === 'success'
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-destructive/40 bg-destructive/10 text-destructive'
                }`}
              >
                {actionToast.message}
              </div>
            )}

            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageMultiple01Icon size={32} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Start a conversation</h2>
                <p className="text-muted-foreground">Ask me anything about government services</p>
                <div className="mt-6 w-full max-w-5xl mx-auto rounded-2xl border border-border bg-card/70 p-4 sm:p-6 text-left">
                  <div className="mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      {ACTION_HUB_COPY.action_hub_copy.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ACTION_HUB_COPY.action_hub_copy.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {ACTION_HUB_COPY.action_hub_copy.helper_note}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {actionModules.map((action) => {
                      const copy = getActionCopy(action.id);
                      const locked = isActionLocked(action);
                      const quotaBadge = getActionQuotaBadge(action);
                      return (
                        <div
                          key={action.id}
                          className={`rounded-xl border p-4 transition-all ${
                            locked
                              ? 'border-border bg-muted/60'
                              : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {(action.icon || 'AC').replace('Icon', '').slice(0, 2).toUpperCase()}
                            </div>
                            {locked && <span className="text-xs text-muted-foreground">Upgrade</span>}
                          </div>

                          <h4 className="text-sm font-semibold text-foreground mt-3">
                            {copy.card_title || action.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {copy.card_description || action.description}
                          </p>

                          {quotaBadge && (
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-muted-foreground">{quotaBadge.metricLabel}</span>
                              <span className={`text-[11px] px-2 py-1 rounded-full ${quotaBadge.className}`}>
                                {quotaBadge.label}
                              </span>
                            </div>
                          )}

                          <button
                            onClick={() => openActionDialog(action)}
                            className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                          >
                            {commonCopy.open_button || 'Open'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-4">
                    {commonCopy.disclaimer}
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              const menuId = getDownloadMenuId(message, index);
              const isDownloadMenuOpen = downloadMenuOpenFor === menuId;
              const automationStatus = getAutomationStateForMessage(menuId);
              const automationError = automationButtonStates[menuId]?.error || '';
              const assistantMedia = message.role === 'assistant'
                ? parseAssistantVideoEmbeds(message.content || '')
                : null;

              return (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className="flex flex-col gap-2 max-w-[90%] sm:max-w-[85%]">
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
                        <Mic01Icon size={12} />
                        <span>Voice</span>
                      </div>
                    )}
                    
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-card-foreground prose-strong:text-foreground prose-ul:text-card-foreground prose-ol:text-card-foreground prose-li:text-card-foreground prose-code:text-card-foreground prose-pre:bg-muted prose-pre:text-foreground">
                        {assistantMedia?.topVideos.map((video, videoIndex) =>
                          renderYouTubeEmbed(video, `${menuId}-top-${video.videoId}-${videoIndex}`)
                        )}

                        {assistantMedia?.sanitizedText ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {assistantMedia.sanitizedText}
                          </ReactMarkdown>
                        ) : null}

                        {assistantMedia?.bottomVideos.map((video, videoIndex) =>
                          renderYouTubeEmbed(video, `${menuId}-bottom-${video.videoId}-${videoIndex}`)
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons for assistant messages */}
                  {message.role === 'assistant' && (
                    <div className="flex flex-wrap items-center gap-2 px-2">
                      <button
                        onClick={() => handleTextToSpeech(message)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                        title={speakingMessageId === message.timestamp ? "Stop speaking" : "Read aloud"}
                      >
                        <VolumeHighIcon 
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
                          <Tick02Icon size={16} className="text-green-500" />
                        ) : (
                          <Copy01Icon size={16} />
                        )}
                      </button>

                      {isDesktopBrowser && (
                        <button
                          onClick={() => handleAutomateMessage(message, menuId)}
                          disabled={automationStatus === 'starting' || automationStatus === 'running'}
                          className={`h-7 px-2.5 rounded-md text-[11px] font-medium border transition-colors inline-flex items-center gap-1.5 ${
                            getAutomationStateClasses(automationStatus)
                          } ${
                            automationStatus === 'starting' || automationStatus === 'running'
                              ? 'cursor-wait'
                              : ''
                          }`}
                          title={automationError || 'Send this response to the automation extension'}
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                              automationStatus === 'starting' || automationStatus === 'running'
                                ? 'bg-primary animate-pulse'
                                : automationStatus === 'done'
                                  ? 'bg-emerald-500'
                                  : automationStatus === 'error'
                                    ? 'bg-destructive'
                                    : 'bg-muted-foreground'
                            }`}
                          />
                          <span>{getAutomationStateLabel(automationStatus)}</span>
                        </button>
                      )}
                      
                      {/* Download button with format dropdown - only for generated documents */}
                      {isGeneratedDocument(message) && (
                        <div className="relative" data-download-menu="true">
                          <button
                            onClick={() => {
                              setDownloadMenuOpenFor(isDownloadMenuOpen ? null : menuId);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                            title="Download document"
                            data-download-menu="true"
                          >
                            <Download01Icon size={16} />
                          </button>

                          {isDownloadMenuOpen && (
                            <div
                              className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-border bg-card shadow-md z-20 p-1"
                              data-download-menu="true"
                            >
                              <button
                                onClick={() => handleDownloadDocument(message, 'pdf')}
                                className="w-full text-left px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded"
                                data-download-menu="true"
                              >
                                Download .pdf
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(message, 'docx')}
                                className="w-full text-left px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded"
                                data-download-menu="true"
                              >
                                Download .docx
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>
              );
            })}

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
                  <Mic01Icon size={16} className="animate-pulse" />
                  <span className="text-sm">Speaking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div
          className={`border-t border-border flex-shrink-0 ${
            isCompactLayout ? 'bg-card/95 px-3 pt-2' : 'bg-card p-3 sm:p-4'
          }`}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <div className="max-w-4xl mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {isCompactLayout && !isInVoiceMode && messages.length === 0 && !selectedFile && (
              <div className="mb-3 -mx-1 overflow-x-auto pb-1">
                <div className="flex gap-2 px-1">
                  {mobileQuickPrompts.map((item) => (
                    <button
                      key={item.title}
                      onClick={() => setInputMessage(item.prompt)}
                      className="min-w-[220px] rounded-2xl border border-border bg-muted/45 px-4 py-3 text-left transition-colors hover:bg-accent/80"
                    >
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Conversation Mode UI */}
            {isInVoiceMode && (
              <div className="mb-4 p-4 sm:p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border-2 border-purple-500/30">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3 sm:gap-4 w-full">
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
                        <Mic01Icon className="text-white relative z-10" size={32} />
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
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
                  
                  <div className="flex w-full justify-end gap-2 md:w-auto">
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
                    <AttachmentIcon className="text-primary" size={20} />
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
                  <Delete02Icon size={18} />
                </button>
              </div>
            )}
            
            {/* Regular Input Controls (Hidden in Voice Mode) */}
            {!isInVoiceMode && (
              <>
                {isCompactLayout ? (
                  <div className="rounded-[2rem] border border-border bg-background px-3 pt-3 pb-2 shadow-sm">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={selectedFile ? 'Add a question about the document (optional)...' : 'Ask anything'}
                      className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground px-1"
                      rows={2}
                      style={{ maxHeight: '140px' }}
                    />

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isMetricLocked('document_analysis')}
                          className={`h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors ${
                            isMetricLocked('document_analysis')
                              ? 'text-muted-foreground/50 bg-muted cursor-not-allowed'
                              : 'text-foreground hover:bg-accent'
                          }`}
                          title={
                            isMetricLocked('document_analysis')
                              ? 'Document analysis quota exhausted. Upgrade plan.'
                              : 'Upload document'
                          }
                        >
                          <Add01Icon size={20} />
                        </button>

                        <button
                          onClick={() => setSidebarOpen(true)}
                          className="h-10 w-10 inline-flex items-center justify-center rounded-full text-foreground hover:bg-accent transition-colors"
                          title="Open chats and settings"
                        >
                          <Menu01Icon size={20} />
                        </button>

                        <div className="rounded-full border border-border px-2 py-1.5">
                          <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="bg-transparent text-xs text-foreground outline-none"
                            aria-label="Voice language"
                          >
                            <option value="en">EN</option>
                            <option value="hi">HI</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={isRecording ? handleStopRecording : handleStartRecording}
                          disabled={!isRecording && isMetricLocked('stt_requests')}
                          className={`h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors ${
                            isRecording
                              ? 'bg-destructive text-destructive-foreground animate-pulse'
                              : isMetricLocked('stt_requests')
                                ? 'text-muted-foreground/50 bg-muted cursor-not-allowed'
                                : 'text-foreground hover:bg-accent'
                          }`}
                          title={
                            isMetricLocked('stt_requests') && !isRecording
                              ? 'Voice quota exhausted. Upgrade plan.'
                              : 'Voice to text'
                          }
                        >
                          <Mic01Icon size={20} />
                        </button>

                        <button
                          onClick={startVoiceConversation}
                          disabled={isMetricLocked('stt_requests')}
                          className={`h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors ${
                            isMetricLocked('stt_requests')
                              ? 'text-muted-foreground/50 bg-muted cursor-not-allowed'
                              : 'bg-foreground text-background hover:opacity-90'
                          }`}
                          title={
                            isMetricLocked('stt_requests')
                              ? 'Voice quota exhausted. Upgrade plan.'
                              : 'Start AI voice conversation'
                          }
                        >
                          <Call02Icon size={18} />
                        </button>

                        <button
                          onClick={handleSendMessage}
                          disabled={(!inputMessage.trim() && !selectedFile) || isLoading}
                          className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title={selectedFile ? 'Analyze document' : 'Send message'}
                        >
                          {isAnalyzing ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ArrowRight01Icon size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 sm:gap-3">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={startVoiceConversation}
                        disabled={isMetricLocked('stt_requests')}
                        className={`p-2.5 sm:p-3 rounded-lg transition-colors ${
                          isMetricLocked('stt_requests')
                            ? 'text-muted-foreground/50 bg-muted cursor-not-allowed'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                        title={isMetricLocked('stt_requests') ? 'Voice quota exhausted. Upgrade plan.' : 'Start AI voice conversation'}
                      >
                        <Call02Icon size={20} />
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isMetricLocked('document_analysis')}
                        className={`p-2.5 sm:p-3 rounded-lg transition-colors ${
                          isMetricLocked('document_analysis')
                            ? 'text-muted-foreground/50 bg-muted cursor-not-allowed'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                        title={isMetricLocked('document_analysis') ? 'Document analysis quota exhausted. Upgrade plan.' : 'Upload document (legal notice, certificate, etc.)'}
                      >
                        <AttachmentIcon size={20} />
                      </button>

                      <button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        disabled={!isRecording && isMetricLocked('stt_requests')}
                        className={`p-2.5 sm:p-3 transition-colors rounded-lg ${
                          isRecording
                            ? 'bg-destructive text-destructive-foreground animate-pulse'
                            : isMetricLocked('stt_requests')
                              ? 'text-muted-foreground/50 bg-muted cursor-not-allowed'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                        title={
                          isMetricLocked('stt_requests') && !isRecording
                            ? 'Voice quota exhausted. Upgrade plan.'
                            : 'Voice to text'
                        }
                      >
                        <Mic01Icon size={20} />
                      </button>
                    </div>

                    <div className="flex-1 bg-input rounded-[1.4rem] px-3 sm:px-5 py-2.5 sm:py-3 flex items-center border border-border focus-within:ring-2 focus-within:ring-ring transition-all">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={selectedFile ? 'Add a question about the document (optional)...' : 'Type your message...'}
                        className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground"
                        rows={1}
                        style={{ maxHeight: '120px' }}
                      />
                    </div>

                    <button
                      onClick={handleSendMessage}
                      disabled={(!inputMessage.trim() && !selectedFile) || isLoading}
                      className="p-2.5 sm:p-3 bg-primary text-primary-foreground rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                      title={selectedFile ? 'Analyze document' : 'Send message'}
                    >
                      {isAnalyzing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ArrowRight01Icon size={20} />
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {activeAction && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {getActionCopy(activeAction.id).dialog_title || activeAction.dialog?.title || activeAction.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {getActionCopy(activeAction.id).dialog_intro || activeAction.description}
                </p>
              </div>
              <button
                onClick={closeActionDialog}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {commonCopy.cancel_button || 'Cancel'}
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {(activeAction.dialog?.fields || []).map((field) => {
                const label = `${field.label}${field.required ? (commonCopy.required_suffix || '*') : ''}`;
                const currentValue = field.type === 'file'
                  ? ''
                  : (actionFormValues[field.id] ?? '');
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {label}
                    </label>

                    {field.type === 'select' && (
                      <select
                        value={currentValue}
                        onChange={(e) => updateActionFieldValue(field.id, e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        value={currentValue}
                        onChange={(e) => updateActionFieldValue(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="w-full min-h-[90px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      />
                    )}

                    {(field.type === 'text' || field.type === 'date') && (
                      <input
                        type={field.type}
                        value={currentValue}
                        onChange={(e) => updateActionFieldValue(field.id, e.target.value)}
                        maxLength={field.max_length || undefined}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      />
                    )}

                    {field.type === 'file' && (
                      <div className="space-y-1">
                        <input
                          key={`${field.id}-${actionFileInputVersion}`}
                          type="file"
                          accept={Array.isArray(field.accept) ? field.accept.join(',') : undefined}
                          onChange={(e) => updateActionFieldFile(field.id, e.target.files?.[0] || null)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary"
                        />
                        {actionFormFiles[field.id]?.name && (
                          <p className="text-xs text-muted-foreground">Selected: {actionFormFiles[field.id].name}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {actionFormError && (
              <p className="mt-4 text-sm text-destructive">{actionFormError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={closeActionDialog}
                className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors"
              >
                {commonCopy.cancel_button || 'Cancel'}
              </button>
              <button
                onClick={submitActionDialog}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {activeAction.dialog?.submit_label || commonCopy.submit_button || 'Generate Query & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatInterface;
