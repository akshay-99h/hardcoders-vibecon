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
  
  useEffect(() => {
    startAICall();
    return () => cleanup();
  }, []);
  
  const startAICall = async () => {
    try {
      const response = await api.post('/api/ai-call/start', {
        conversation_id: conversationId,
        language: 'en'
      });
      
      setCallId(response.data.call_id);
      setCallState('listening');
      await startRecording();
    } catch (err) {
      console.error('Failed to start AI call:', err);
      setCallState('ended');
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToAI(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') stopRecording();
      }, 10000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setCallState('ended');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const sendAudioToAI = async (audioBlob) => {
    setCallState('thinking');
    
    try {
      console.log('Sending audio to AI, blob size:', audioBlob.size);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      
      console.log('Call ID:', callId);
      
      const response = await api.post(`/api/ai-call/turn?call_id=${callId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('AI response:', response.data);
      
      setTranscription(response.data.transcribed_text);
      setAiResponse(response.data.response_text);
      setCallState('speaking');
      
      const audio = new Audio(`data:audio/mp3;base64,${response.data.response_audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => {
        setCallState('listening');
        startRecording();
      };
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setCallState('listening');
        startRecording();
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
    if (callId) {
      try {
        await api.post('/api/ai-call/end', { call_id: callId });
      } catch (err) {
        console.error('End call error:', err);
      }
    }
    cleanup();
    navigate('/chat');
  };
  
  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
