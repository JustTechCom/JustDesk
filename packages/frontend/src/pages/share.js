import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head'; 
import { Wifi, Users, AlertCircle, Monitor, Clock, Play } from 'lucide-react'; 
import Layout from '../components/Layout';
import ScreenShare from '../components/ScreenShare';
import ConnectionPanel from '../components/ConnectionPanel';
import useWebRTC from '../hooks/useWebRTC';
import useSocket from '../hooks/useSocket';

export default function ShareScreen() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState(''); 
  const [sessionStartTime, setSessionStartTime] = useState(null); // Room creation
  const [sharingStartTime, setSharingStartTime] = useState(null); // Actual sharing start 
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
        setSessionStartTime(response.sessionStartTime || Date.now());
        setConnectionError('');
        console.log('Room created successfully:', response.roomId);
      } else {
        setError(response?.error || 'Failed to create room');
        setConnectionError('Failed to create room');
      }
    });
  };

  const handleStartShare = async () => {
    try {
      console.log('🎥 Starting screen share...');
      await startScreenShare();
      
      // Sharing başladığında timer'ı başlat
      const shareStartTime = Date.now();
      setSharingStartTime(shareStartTime);
      setIsSharing(true);
      setError('');
      
      console.log('✅ Screen sharing started at:', new Date(shareStartTime).toLocaleTimeString());
      
      // Backend'e sharing başladığını bildir
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
    
    // Backend'e sharing durduğunu bildir
    if (socket && roomId) {
      socket.emit('sharing-stopped', {
        roomId,
        stopTime: Date.now()
      });
    }
    
    setSharingStartTime(null); // Timer'ı reset et
    router.push('/');
  };

  // Socket event handlers
  useEffect(() => {
    if (socket) {
      const handleViewerJoined = ({ viewerId, roomId: joinedRoomId, joinedAt }) => {
        console.log('🎯 Viewer joined event received:', viewerId, 'Room:', joinedRoomId);
        setViewers(prev => {
 
          const exists = prev.some(v => v.id === viewerId);
          if (!exists) {
            const newViewer = { 
              id: viewerId, 
              joinedAt: joinedAt || Date.now() 
            };
            console.log('➕ Adding viewer to list:', newViewer); 
            return [...prev, newViewer]; 
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

      // Session timeout handler
      const handleSessionTimeout = ({ message, duration }) => {
        console.log('⏰ Session timeout received:', message);
        setError('Session expired after 1 hour');
        setIsSharing(false);
        setSharingStartTime(null);
        
        // Auto redirect after a delay
        setTimeout(() => {
          router.push('/');
        }, 5000);
      };

      // Session ended handler
      const handleSessionEnded = ({ reason, message }) => {
        console.log('🔚 Session ended:', reason, message);
        if (reason === 'timeout') {
          setError('Session expired after 1 hour');
          setIsSharing(false);
          setSharingStartTime(null);
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
      socket.on('session-timeout', handleSessionTimeout);
      socket.on('session-ended', handleSessionEnded);
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      return () => {
        socket.off('viewer-joined', handleViewerJoined);
        socket.off('viewer-disconnected', handleViewerDisconnected);
        socket.off('viewer-left', handleViewerDisconnected);
        socket.off('participant-update', handleParticipantUpdate);
        socket.off('session-timeout', handleSessionTimeout);
        socket.off('session-ended', handleSessionEnded);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      };
    }
  }, [socket, router]);

  // Debug function
  const debugSharingStats = async () => {
    if (socket && roomId) {
      socket.emit('get-sharing-stats', roomId, (response) => {
        console.log('📊 Sharing stats:', response);
      });
    }
  };

  // Calculate current session time
  const getCurrentSessionTime = () => {
    if (isSharing && sharingStartTime) {
      const elapsed = Date.now() - sharingStartTime;
      const minutes = Math.floor(elapsed / (1000 * 60));
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return null;
  };
 

  // Debug: viewer sayısının değişimini izle
  useEffect(() => {
    console.log('👥 Viewers state updated:', viewers.length, viewers);
  }, [viewers]);

  // Debugging function - development only
  const debugRoomStatus = async () => {
    if (socket && roomId) {
      socket.emit('get-room-status', roomId, (response) => {
        console.log('🐛 Room status debug:', response);
      });
    }
  };

  return (
    <Layout>
      <Head>
        <title>Share Screen - JustDesk</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12">
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
               
              {/* Session Status Indicator */}
              {roomId && (
                <div className="mt-4 inline-flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      isSharing ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                    }`}></div>
                    <span className="text-gray-300">
                      {isSharing ? 'Live Session' : 'Ready to Share'}
                    </span>
                  </div>
                  {isSharing && sharingStartTime && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-blue-400 mr-1" />
                      <span className="text-blue-400">
                        {getCurrentSessionTime()}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Debug panel - sadece development için */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">
                  <div className="flex items-center justify-center space-x-4 flex-wrap">
 
                    <span>🔌 Connected: {connected ? '✅' : '❌'}</span>
                    <span>🏠 Room: {roomId || 'None'}</span>
                    <span>👥 Viewers: {viewers.length}</span>
                    <span>📺 Sharing: {isSharing ? '✅' : '❌'}</span> 
                    <span>⏱️ Timer: {sharingStartTime ? '✅' : '❌'}</span>
                    {roomId && (
                      <>
                        <button 
                          onClick={() => {
                            socket.emit('get-room-status', roomId, (response) => {
                              console.log('🐛 Room status:', response);
                            });
                          }}
                          className="px-2 py-1 bg-blue-600 rounded text-xs"
                        >
                          Room Status
                        </button>
                        <button 
                          onClick={debugSharingStats}
                          className="px-2 py-1 bg-green-600 rounded text-xs"
                        >
                          Sharing Stats
                        </button>
                      </>
 
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
                  sharingStartTime={sharingStartTime} // Sharing timer için
 
                />
              </div>
            </div>

            {/* Live Session Info */}
            {isSharing && (
              <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      <span className="text-white font-medium">LIVE</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-white">{viewers.length} viewers watching</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-white">
                        Duration: {getCurrentSessionTime() || '0:00'}
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm"> 
                    Started at {sharingStartTime ? new Date(sharingStartTime).toLocaleTimeString() : '--:--'}
                  </div>
                </div>
              </div>
            )}

            {/* Waiting State */}
            {roomId && !isSharing && (
              <div className="mt-8 bg-yellow-600/20 backdrop-blur-lg rounded-xl p-4 border border-yellow-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-white font-medium">Room Ready</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-white">{viewers.length} waiting</span>
                    </div>
                  </div>
                  <div className="text-yellow-200 text-sm flex items-center">
                    <Play className="w-4 h-4 mr-1" />
                    Timer starts when you begin sharing 
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}