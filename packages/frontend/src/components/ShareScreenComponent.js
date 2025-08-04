import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Monitor, Copy, CheckCircle, XCircle, Users, Wifi, AlertCircle } from 'lucide-react';
import Layout from './Layout';
import ScreenShare from './ScreenShare';
import ConnectionPanel from './ConnectionPanel';
import useWebRTC from '../hooks/useWebRTC';
import useSocket from '../hooks/useSocket';

export default function ShareScreenComponent() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState(''); 
  const [sessionStartTime, setSessionStartTime] = useState(null); // Room creation time
  const [sharingStartTime, setSharingStartTime] = useState(null); // Actual sharing start time
  const [isCreatingRoom, setIsCreatingRoom] = useState(false); 
  
  const { socket, connected } = useSocket();
  const { startScreenShare, stopScreenShare, stream } = useWebRTC(socket);

  useEffect(() => {
    if (connected && !roomId && !isCreatingRoom) {
      console.log('Socket connected, creating room...');
      createRoom();
    } else if (!connected) {
      setConnectionError('Connecting to server...');
    }
  }, [connected, roomId, isCreatingRoom]);

  const createRoom = () => {
    if (!socket) {
      console.error('Socket not available');
      setConnectionError('Socket connection not available');
      return;
    }

    if (isCreatingRoom) {
      console.log('Room creation already in progress...');
      return;
    }

    setIsCreatingRoom(true);
    console.log('Emitting create-room event...');
    
    socket.emit('create-room', (response) => {
      console.log('Room creation response:', response);
      setIsCreatingRoom(false);
      
      if (response && response.success) {
        setRoomId(String(response.roomId));
        setPassword(String(response.password)); 
        setSessionStartTime(response.sessionStartTime || Date.now()); // Room creation time 
        setConnectionError('');
        console.log('Room created successfully:', response.roomId);
      } else {
        setError(response?.error || 'Failed to create room');
        setConnectionError('Failed to create room');
      }
    });
  };

  const handleStartShare = async (mediaOptions = {}) => {
    try {
      console.log('🎥 Starting screen share...');
      await startScreenShare(mediaOptions);
      
      // Screen sharing başladığında timer'ı başlat
      const shareStartTime = Date.now();
      setSharingStartTime(shareStartTime);
      setIsSharing(true);
      setError('');
      
      console.log('✅ Screen sharing started at:', new Date(shareStartTime).toLocaleTimeString());
      
      // Backend'e sharing başladığını bildir (optional)
      if (socket && roomId) {
        socket.emit('sharing-started', {
          roomId,
          startTime: shareStartTime
        });
      }
      
    } catch (err) {
      setError('Failed to start screen sharing. Please check permissions.');
      console.error('❌ Screen sharing failed:', err);
    }
  };

  const handleStopShare = () => {
    console.log('🛑 Stopping screen share...');
    stopScreenShare();
    setIsSharing(false);
    setSharingStartTime(null); // Timer'ı reset et
    
    // Backend'e sharing durduğunu bildir (optional)
    if (socket && roomId) {
      socket.emit('sharing-stopped', {
        roomId,
        stopTime: Date.now()
      });
    }
    
    router.push('/');
  };

  // Socket event handlers
  useEffect(() => {
    if (socket) { 
      const handleViewerJoined = ({ viewerId, roomId: joinedRoomId, joinedAt }) => {
        console.log('🎯 Viewer joined event received:', viewerId, 'Room:', joinedRoomId);
        setViewers(prev => {
          // Viewer zaten listede mi kontrol et
          const exists = prev.some(v => v.id === viewerId);
          if (!exists) {
            const newViewer = { 
              id: viewerId, 
              joinedAt: joinedAt || Date.now() 
            };
            console.log('➕ Adding viewer to list:', newViewer);
            const newViewers = [...prev, newViewer];
            console.log('📊 New viewers array:', newViewers);
            return newViewers;
          }
          console.log('⚠️ Viewer already exists in list'); 
          return prev;
        });
      };
 
      const handleViewerDisconnected = ({ viewerId, totalViewers }) => {
        console.log('🎯 Viewer disconnected event received:', viewerId);
        setViewers(prev => {
          const filtered = prev.filter(v => v.id !== viewerId);
          console.log('➖ Removing viewer from list. New count:', filtered.length);
          console.log('📊 Updated viewers array:', filtered); 
          return filtered;
        });
      };
 
      const handleParticipantUpdate = ({ type, viewerId, totalViewers }) => {
        console.log('🎯 Participant update:', type, viewerId, 'Total:', totalViewers);
        if (type === 'joined') {
          handleViewerJoined({ viewerId, joinedAt: Date.now() });
        } else if (type === 'left') {
          handleViewerDisconnected({ viewerId, totalViewers });
        }
      };

      const handleConnect = () => {
        console.log('🔌 Socket connected in component'); 
        setConnectionError('');
      };

      const handleDisconnect = () => { 
        console.log('🔌 Socket disconnected'); 
        setConnectionError('Disconnected from server');
      };

      const handleConnectError = (error) => { 
        console.error('🔌 Socket connection error:', error); 
        setConnectionError('Failed to connect to server');
      };

      // Event listener'ları ekle
      socket.on('viewer-joined', handleViewerJoined);
      socket.on('viewer-disconnected', handleViewerDisconnected); 
      socket.on('viewer-left', handleViewerDisconnected);
      socket.on('participant-update', handleParticipantUpdate); 
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError); 
      return () => {
        socket.off('viewer-joined', handleViewerJoined);
        socket.off('viewer-disconnected', handleViewerDisconnected);
        socket.off('viewer-left', handleViewerDisconnected); 
        socket.off('participant-update', handleParticipantUpdate); 
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      }; 
    }
  }, [socket]);

  // Debug: viewer sayısının değişimini izle
  useEffect(() => {
    console.log('👥 Viewers state updated:', viewers.length, viewers);
  }, [viewers]);

  // Sharing state değişimini izle
  useEffect(() => {
    console.log('🎥 Sharing state changed:', {
      isSharing,
      sharingStartTime: sharingStartTime ? new Date(sharingStartTime).toLocaleTimeString() : null
    });
  }, [isSharing, sharingStartTime]);

  // Debugging function - development only
  const debugRoomStatus = async () => {
    if (socket && roomId) {
      socket.emit('get-room-status', roomId, (response) => {
        console.log('🐛 Room status debug:', response);
      });
    }
  };

  // Debug: viewer sayısının değişimini izle
  useEffect(() => {
    console.log('Viewers updated:', viewers);
  }, [viewers]);

  return (
    <>
      <Head>
        <title>Share Screen - JustDesk</title>
      </Head>

      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">
                Share Your Screen
              </h1>
              <p className="text-xl text-gray-300">
                Share your screen securely with anyone, anywhere
              </p>
              
              {connectionError && (
                <div className="mt-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg px-4 py-2 inline-flex items-center text-yellow-300">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {connectionError}
                </div>
              )}
               
              {/* Debug panel - sadece development için */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">
                  <div className="flex items-center justify-center space-x-4">
                    <span>🔌 Connected: {connected ? '✅' : '❌'}</span>
                    <span>🏠 Room: {roomId || 'None'}</span>
                    <span>👥 Viewers: {viewers.length}</span>
                    <span>📺 Sharing: {isSharing ? '✅' : '❌'}</span>
                    <span>⏱️ Timer: {sharingStartTime ? '✅' : '❌'}</span>
                    {roomId && (
                      <button 
                        onClick={debugRoomStatus}
                        className="px-2 py-1 bg-blue-600 rounded text-xs"
                      >
                        Debug Room
                      </button>
                    )}
                  </div> 
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ScreenShare
                  stream={stream}
                  isSharing={isSharing}
                  onStartShare={handleStartShare}
                  onStopShare={handleStopShare}
                  error={error}
                />
              </div>

              <div className="lg:col-span-1">
                <ConnectionPanel
                  roomId={roomId}
                  password={password}
                  viewers={viewers}
                  isSharing={isSharing} 
                  sharingStartTime={sharingStartTime} // Sharing başlama zamanı 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}