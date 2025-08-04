import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';

export default function useWebRTC(socket) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peers, setPeers] = useState({});
  const peersRef = useRef({});

  const startScreenShare = async (useCamera = false, useMicrophone = false) => {
    try {
      // Always capture the screen
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      // Optionally capture camera and/or microphone
      if (useCamera || useMicrophone) {
        try {
          const userStream = await navigator.mediaDevices.getUserMedia({
            video: useCamera,
            audio: useMicrophone
          });

          userStream.getTracks().forEach(track => {
            displayStream.addTrack(track);
          });
        } catch (err) {
          console.error('❌ Error getting user media:', err);
        }
      }

      setLocalStream(displayStream);

      // Handle stream end
      displayStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      console.log('🎥 Screen share started successfully');
      return displayStream;
    } catch (error) {
      console.error('❌ Error starting screen share:', error);
      throw error;
    }
  };

  const stopScreenShare = () => {
    console.log('🛑 Stopping screen share...');
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('⏹️ Stopped track:', track.kind);
      });
      setLocalStream(null);
    }
    
    // Clean up all peer connections
    Object.entries(peersRef.current).forEach(([peerId, peer]) => {
      console.log('🔗 Destroying peer connection:', peerId);
      peer.destroy();
    });
    peersRef.current = {};
    setPeers({});
    
    console.log('✅ Screen share stopped and peers cleaned up');
  };

  const createPeer = (targetId, initiator, stream) => {
    console.log(`🔗 Creating peer connection: ${targetId}, initiator: ${initiator}`);
    
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: process.env.NEXT_PUBLIC_TURN_URL || 'turn:turn.example.com:3478',
            username: process.env.NEXT_PUBLIC_TURN_USERNAME || 'username',
            credential: process.env.NEXT_PUBLIC_TURN_PASSWORD || 'password'
          }
        ]
      }
    });

    peer.on('signal', signal => {
      console.log(`📡 Sending ${initiator ? 'offer' : 'answer'} to ${targetId}`);
      socket.emit(initiator ? 'offer' : 'answer', {
        [initiator ? 'offer' : 'answer']: signal,
        to: targetId
      });
    });

    peer.on('stream', stream => {
      console.log(`📺 Received remote stream from ${targetId}`);
      setRemoteStream(stream);
    });

    peer.on('connect', () => {
      console.log(`✅ Peer connected: ${targetId}`);
    });

    peer.on('error', err => {
      console.error(`❌ Peer connection error with ${targetId}:`, err);
    });

    peer.on('close', () => {
      console.log(`🔌 Peer connection closed: ${targetId}`);
      delete peersRef.current[targetId];
      setPeers(prev => {
        const newPeers = { ...prev };
        delete newPeers[targetId];
        return newPeers;
      });
    });

    return peer;
  };

  useEffect(() => {
    if (!socket) return;

    // Handle incoming viewer (host side)
    const handleViewerJoined = ({ viewerId, requestStream }) => {
      console.log(`👤 New viewer joined: ${viewerId}, requesting stream: ${requestStream}`);
      
      if (localStream && requestStream) {
        console.log(`🎥 Creating offer for viewer ${viewerId} with local stream`);
        const peer = createPeer(viewerId, true, localStream);
        peersRef.current[viewerId] = peer;
        setPeers(prev => ({ ...prev, [viewerId]: peer }));
      } else if (requestStream) {
        console.log(`⚠️ Viewer requested stream but no local stream available`);
      }
    };

    // Handle offer from host (viewer side)
    const handleOffer = ({ offer, from }) => {
      console.log(`📨 Received offer from host: ${from}`);
      const peer = createPeer(from, false, null);
      peer.signal(offer);
      peersRef.current[from] = peer;
      setPeers(prev => ({ ...prev, [from]: peer }));
    };

    // Handle answer from viewer (host side)
    const handleAnswer = ({ answer, from }) => {
      console.log(`📨 Received answer from viewer: ${from}`);
      const peer = peersRef.current[from];
      if (peer) {
        peer.signal(answer);
      } else {
        console.error(`❌ No peer found for viewer: ${from}`);
      }
    };

    // Handle ICE candidates
    const handleIceCandidate = ({ candidate, from }) => {
      const peer = peersRef.current[from];
      if (peer) {
        peer.signal({ candidate });
      }
    };

    // Handle viewer disconnect
    const handleViewerDisconnected = ({ viewerId }) => {
      console.log(`👤 Viewer disconnected: ${viewerId}`);
      const peer = peersRef.current[viewerId];
      if (peer) {
        peer.destroy();
        delete peersRef.current[viewerId];
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[viewerId];
          return newPeers;
        });
      }
    };

    // Host disconnected (viewer side)
    const handleHostDisconnected = () => {
      console.log('🏠 Host disconnected, cleaning up...');
      setRemoteStream(null);
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      peersRef.current = {};
      setPeers({});
    };

    // Attach event listeners
    socket.on('viewer-joined', handleViewerJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('viewer-disconnected', handleViewerDisconnected);
    socket.on('host-disconnected', handleHostDisconnected);

    console.log('🎧 WebRTC event listeners attached');

    return () => {
      console.log('🧹 Cleaning up WebRTC event listeners');
      socket.off('viewer-joined', handleViewerJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('viewer-disconnected', handleViewerDisconnected);
      socket.off('host-disconnected', handleHostDisconnected);
    };
  }, [socket, localStream]);

  // Update peers when local stream changes
  useEffect(() => {
    if (localStream) {
      console.log('🎥 Local stream updated, updating peer connections...');
      Object.entries(peersRef.current).forEach(([peerId, peer]) => {
        if (peer && peer.streams && peer.streams.length === 0) {
          console.log(`📤 Adding stream to existing peer: ${peerId}`);
          peer.addStream(localStream);
        }
      });
    }
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    startScreenShare,
    stopScreenShare,
    peers,
    stream: localStream // Alias for backward compatibility
  };
}