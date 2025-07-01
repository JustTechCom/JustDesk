import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';

export default function useWebRTC(socket) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peers, setPeers] = useState({});
  const peersRef = useRef({});

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setLocalStream(stream);

      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Clean up all peer connections
    Object.values(peersRef.current).forEach(peer => {
      peer.destroy();
    });
    peersRef.current = {};
    setPeers({});
  };

  const createPeer = (targetId, initiator, stream) => {
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
      socket.emit(initiator ? 'offer' : 'answer', {
        [initiator ? 'offer' : 'answer']: signal,
        to: targetId
      });
    });

    peer.on('stream', stream => {
      setRemoteStream(stream);
    });

    peer.on('error', err => {
      console.error('Peer connection error:', err);
    });

    peer.on('close', () => {
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

    // Handle incoming viewer
    socket.on('viewer-joined', ({ viewerId }) => {
      if (localStream) {
        const peer = createPeer(viewerId, true, localStream);
        peersRef.current[viewerId] = peer;
        setPeers(prev => ({ ...prev, [viewerId]: peer }));
      }
    });

    // Handle offer from host
    socket.on('offer', ({ offer, from }) => {
      const peer = createPeer(from, false, null);
      peer.signal(offer);
      peersRef.current[from] = peer;
      setPeers(prev => ({ ...prev, [from]: peer }));
    });

    // Handle answer from viewer
    socket.on('answer', ({ answer, from }) => {
      const peer = peersRef.current[from];
      if (peer) {
        peer.signal(answer);
      }
    });

    // Handle viewer disconnect
    socket.on('viewer-disconnected', ({ viewerId }) => {
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
    });

    return () => {
      socket.off('viewer-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('viewer-disconnected');
    };
  }, [socket, localStream]);

  return {
    localStream,
    remoteStream,
    startScreenShare,
    stopScreenShare,
    peers
  };
}