import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiPhone, HiPhoneMissedCall, HiVolumeUp } from 'react-icons/hi';
import api from '../utils/api';

function AICall() {
  const navigate = useNavigate();
  const location = useLocation();
  const conversationId = location.state?.conversationId;
  
  const [callState, setCallState] = useState('connecting');
  const [callId, setCallId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const callIdRef = useRef(null);
  const recordingVadFrameRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const recordingAudioContextRef = useRef(null);
  const isStartingRecordingRef = useRef(false);
  const isMountedRef = useRef(true);

  const clearRecordingRuntimeArtifacts = () => {
    if (recordingVadFrameRef.current !== null) {
      window.cancelAnimationFrame(recordingVadFrameRef.current);
      recordingVadFrameRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    const audioContext = recordingAudioContextRef.current;
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
    recordingAudioContextRef.current = null;
  };
  
  useEffect(() => {
    startAICall();
    return () => {
      isMountedRef.current = false;
      const activeCallId = callIdRef.current;
      if (activeCallId) {
        api.post('/api/ai-call/end', { call_id: activeCallId }).catch(() => {});
      }
      cleanup();
    };
  }, []);

  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);
  
  const startAICall = async () => {
    try {
      const response = await api.post('/api/ai-call/start', {
        conversation_id: conversationId,
        language: 'en'
      });

      const nextCallId = response.data.call_id;
      setCallId(nextCallId);
      callIdRef.current = nextCallId;
      setCallState('listening');
      await startRecording();
    } catch (err) {
      console.error('Failed to start AI call:', err);
      setCallState('ended');
    }
  };
  
  const startRecording = async () => {
    if (!isMountedRef.current) return;
    if (isStartingRecordingRef.current) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return;

    isStartingRecordingRef.current = true;

    try {
      clearRecordingRuntimeArtifacts();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      console.log('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      console.log('Got media stream');
      streamRef.current = stream;
      
      // Check for supported mime types
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }
      console.log('Using mime type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available, size:', event.data.size);
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      // Voice activity detection for lower-latency turn endings
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      recordingAudioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const SPEECH_THRESHOLD = 12;
      const SILENCE_FRAMES_NEEDED = 60; // ~1 second
      const MIN_SPEECH_FRAMES = 12; // ~200ms
      let speechDetected = false;
      let speechFrames = 0;
      let silenceFrames = 0;

      const detectSound = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          clearRecordingRuntimeArtifacts();
          return;
        }

        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / bufferLength);
        const volume = rms * 100;

        if (volume > SPEECH_THRESHOLD) {
          speechFrames++;
          silenceFrames = 0;
          if (!speechDetected && speechFrames > MIN_SPEECH_FRAMES) {
            speechDetected = true;
          }
        } else if (speechDetected) {
          silenceFrames++;
          if (silenceFrames >= SILENCE_FRAMES_NEEDED) {
            stopRecording();
            return;
          }
        }

        recordingVadFrameRef.current = window.requestAnimationFrame(detectSound);
      };
      
      mediaRecorder.onstop = async () => {
        clearRecordingRuntimeArtifacts();
        setIsRecording(false);

        stream.getTracks().forEach(track => track.stop());
        if (streamRef.current === stream) {
          streamRef.current = null;
        }

        if (!isMountedRef.current) return;

        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Created blob, size:', audioBlob.size);
        if (audioBlob.size > 0) {
          await sendAudioToAI(audioBlob);
        } else {
          console.error('Empty audio blob!');
          alert('No audio recorded. Please try again.');
          setCallState('listening');
          startRecording();
        }
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      console.log('Recording started');

      recordingVadFrameRef.current = window.requestAnimationFrame(detectSound);

      // Hard safety cap to avoid hanging recorder sessions
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorder.state === 'recording' && speechDetected) {
          console.log('Auto-stopping recording after 10s');
          stopRecording();
        }
      }, 10000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert(`Microphone error: ${err.message}`);
      setCallState('ended');
    } finally {
      isStartingRecordingRef.current = false;
    }
  };
  
  const stopRecording = () => {
    clearRecordingRuntimeArtifacts();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const sendAudioToAI = async (audioBlob) => {
    const activeCallId = callIdRef.current;
    if (!activeCallId) {
      setCallState('ended');
      return;
    }

    setCallState('thinking');
    
    try {
      console.log('Sending audio to AI, blob size:', audioBlob.size);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      
      console.log('Call ID:', activeCallId);
      
      const response = await api.post(`/api/ai-call/turn?call_id=${activeCallId}&include_audio=true`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('AI response:', response.data);

      if (response.data?.no_speech || !response.data?.transcribed_text?.trim()) {
        setCallState('listening');
        if (isMountedRef.current) {
          await startRecording();
        }
        return;
      }
      
      setTranscription(response.data.transcribed_text);
      setAiResponse(response.data.response_text);
      setCallState('speaking');

      if (!response.data.response_audio_base64) {
        setCallState('listening');
        if (isMountedRef.current) {
          await startRecording();
        }
        return;
      }

      const audio = new Audio(`data:audio/mp3;base64,${response.data.response_audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => {
        setCallState('listening');
        if (isMountedRef.current) {
          startRecording();
        }
      };
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setCallState('listening');
        if (isMountedRef.current) {
          startRecording();
        }
      };
      audio.play();
    } catch (err) {
      console.error('AI call turn error:', err);
      console.error('Error details:', err.response?.data || err.message);
      alert(`Call error: ${err.response?.data?.detail || err.message}`);
      setCallState('ended');
    }
  };
  
  const endCall = async () => {
    const activeCallId = callIdRef.current;
    callIdRef.current = null;
    setCallId(null);

    if (activeCallId) {
      try {
        await api.post('/api/ai-call/end', { call_id: activeCallId });
      } catch (err) {
        console.error('End call error:', err);
      }
    }
    cleanup();
    navigate('/chat');
  };
  
  const cleanup = () => {
    clearRecordingRuntimeArtifacts();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center relative">
            {callState === 'listening' && (
              <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-75"></div>
            )}
            {callState === 'speaking' && (
              <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse"></div>
            )}
            <HiVolumeUp className="text-white relative z-10" size={64} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'listening' && 'Listening...'}
            {callState === 'thinking' && 'Thinking...'}
            {callState === 'speaking' && 'Speaking...'}
            {callState === 'ended' && 'Call Ended'}
          </h2>
          
          {transcription && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">You said:</p>
              <p className="text-sm text-gray-700">{transcription}</p>
            </div>
          )}
          
          {aiResponse && callState === 'speaking' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-500 mb-1">AI is saying:</p>
              <p className="text-sm text-gray-700">{aiResponse}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-center gap-4">
          {callState === 'listening' && isRecording && (
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-all animate-pulse"
              title="Tap to send"
            >
              <HiPhone size={28} />
            </button>
          )}
          
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all"
            title="End call"
          >
            <HiPhoneMissedCall size={28} />
          </button>
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-4">
          {callState === 'listening' && 'Speak now or tap to send'}
          {callState === 'thinking' && 'Processing your request...'}
          {callState === 'speaking' && 'AI is responding...'}
        </p>
      </div>
    </div>
  );
}

export default AICall;
