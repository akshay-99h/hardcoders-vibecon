import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SimplePeer from 'simple-peer';
import { HiPhoneMissedCall, HiVolumeUp, HiVolumeOff, HiX } from 'react-icons/hi';
import api from '../utils/api';

function Call() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');
  
  const [callState, setCallState] = useState('connecting'); // connecting, waiting_for_peer, in_call, reconnecting, ended, failed
  const [isMuted, setIsMuted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [otherUserId, setOtherUserId] = useState(null);
  
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    
    initializeCall();
    
    return () => {
      cleanup();
    };
  }, [roomId]);
  
  const initializeCall = async () => {
    try {
      // Get call token
      const tokenResp = await api.post('/api/calls/token', { room_id: roomId });
      const { token, ice_servers } = tokenResp.data;
      
      // Get audio stream with echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      localStreamRef.current = stream;
      
      // Connect to WebSocket
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//` +
                    `${window.location.host}/ws/calls/${roomId}?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({ type: 'join' }));
        setCallState('waiting_for_peer');
      };
      
      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        await handleSignalingMessage(message, stream, ice_servers);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setCallState('failed');
        setError('Connection failed');
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed');
        if (callState !== 'ended') {
          setCallState('ended');
        }
      };
      
    } catch (err) {
      console.error('Failed to initialize call:', err);
      setCallState('failed');
      setError(err.message || 'Failed to access microphone');
    }
  };
  
  const handleSignalingMessage = async (message, stream, iceServers) => {
    const { type, from_user_id, participants } = message;
    
    if (type === 'participants' && participants.length > 0) {
      // Create offer to existing participant
      setOtherUserId(participants[0]);
      createPeer(true, stream, iceServers, participants[0]);
    }
    
    else if (type === 'user_joined') {
      // Answer to new participant
      setOtherUserId(from_user_id);
      createPeer(false, stream, iceServers, from_user_id);
    }
    
    else if (type === 'offer') {
      // Received offer, send answer
      if (peerRef.current) {
        peerRef.current.signal(message.sdp);
      }
    }
    
    else if (type === 'answer') {
      // Received answer
      if (peerRef.current) {
        peerRef.current.signal(message.sdp);
      }
    }
    
    else if (type === 'ice_candidate') {
      // Received ICE candidate
      if (peerRef.current && message.candidate) {
        peerRef.current.signal(message.candidate);
      }
    }
    
    else if (type === 'user_left') {
      setCallState('ended');
      setError('Other user left the call');
    }
  };
  
  const createPeer = (initiator, stream, iceServers, targetUserId) => {
    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: true,
      config: {
        iceServers: iceServers || [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    });
    
    peer.on('signal', (signal) => {
      const type = signal.type === 'offer' ? 'offer' : 
                   signal.type === 'answer' ? 'answer' : 'ice_candidate';
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type,
          target_user_id: targetUserId,
          sdp: signal.type ? signal : undefined,
          candidate: !signal.type ? signal : undefined
        }));
      }
    });
    
    peer.on('stream', (remoteStream) => {
      console.log('Received remote stream');
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play();
      }
      setCallState('in_call');
    });
    
    peer.on('connect', () => {
      console.log('Peer connected');
      setCallState('in_call');
    });
    
    peer.on('close', () => {
      console.log('Peer connection closed');
      setCallState('ended');
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setCallState('reconnecting');
      setTimeout(() => {
        if (callState === 'reconnecting') {
          setCallState('failed');
          setError('Connection failed');
        }
      }, 5000);
    });
    
    peerRef.current = peer;
  };
  
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };
  
  const hangUp = () => {
    cleanup();
    navigate('/chat');
  };
  
  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }));
      wsRef.current.close();
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {/* Call Status */}
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            {callState === 'in_call' && (
              <div className="w-24 h-24 bg-white rounded-full animate-pulse"></div>
            )}
            {callState !== 'in_call' && (
              <HiVolumeUp className="text-white" size={64} />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'waiting_for_peer' && 'Waiting for other person...'}
            {callState === 'in_call' && 'Call in Progress'}
            {callState === 'reconnecting' && 'Reconnecting...'}
            {callState === 'ended' && 'Call Ended'}
            {callState === 'failed' && 'Call Failed'}
          </h2>
          
          <p className="text-gray-600">
            {callState === 'in_call' && `Quality: ${connectionQuality}`}
            {error && <span className="text-red-500">{error}</span>}
          </p>
        </div>
        
        {/* Call Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <HiVolumeOff size={28} /> : <HiVolumeUp size={28} />}
          </button>
          
          <button
            onClick={hangUp}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all"
            title="Hang up"
          >
            <HiPhoneMissedCall size={28} />
          </button>
        </div>
        
        {/* Room Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Room: {roomId}</p>
        </div>
        
        {/* Remote Audio Element */}
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
}

export default Call;
