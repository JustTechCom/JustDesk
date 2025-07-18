import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  const { socket, connected } = useSocket();
  const { startScreenShare, stopScreenShare, stream } = useWebRTC(socket);

  useEffect(() => {
    if (connected && !roomId) {
      console.log('Socket connected, creating room...');
      createRoom();
    } else if (!connected) {
      setConnectionError('Connecting to server...');
    }
  }, [connected, roomId]);

  const createRoom = () => {
    if (!socket) {
      console.error('Socket not available');
      setConnectionError('Socket connection not available');
      return;
    }

    console.log('Emitting create-room event...');
    socket.emit('create-room', (response) => {
      console.log('Room creation response:', response);
      if (response && response.success) {
        setRoomId(String(response.roomId));
        setPassword(String(response.password));
        setSessionStartTime(Date.now());
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
      await startScreenShare();
      setIsSharing(true);
      setError('');
    } catch (err) {
      setError('Failed to start screen sharing. Please check permissions.');
      console.error(err);
    }
  };

  const handleStopShare = () => {
    stopScreenShare();
    setIsSharing(false);
    router.push('/');
  };

  useEffect(() => {
    if (socket) {
      const handleViewerJoined = ({ viewerId, roomId: joinedRoomId }) => {
        console.log('Viewer joined:', viewerId, 'Room:', joinedRoomId);
        setViewers(prev => {
          // Eğer viewer zaten listede yoksa ekle
          const exists = prev.some(v => v.id === viewerId);
          if (!exists) {
            const newViewer = { id: viewerId, joinedAt: Date.now() };
            console.log('Adding viewer to list:', newViewer);
            return [...prev, newViewer];
          }
          return prev;
        });
      };

      const handleViewerDisconnected = ({ viewerId }) => {
        console.log('Viewer disconnected:', viewerId);
        setViewers(prev => {
          const filtered = prev.filter(v => v.id !== viewerId);
          console.log('Removing viewer from list. New count:', filtered.length);
          return filtered;
        });
      };

      const handleConnect = () => {
        console.log('Socket connected in component');
        setConnectionError('');
      };

      const handleDisconnect = () => {
        console.log('Socket disconnected');
        setConnectionError('Disconnected from server');
      };

      const handleConnectError = (error) => {
        console.error('Socket connection error:', error);
        setConnectionError('Failed to connect to server');
      };

      // Event listener'ları ekle
      socket.on('viewer-joined', handleViewerJoined);
      socket.on('viewer-disconnected', handleViewerDisconnected);
      socket.on('viewer-left', handleViewerDisconnected); // Alternatif event adı için
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      // Debug için mevcut viewer sayısını logla
      console.log('Current viewers count:', viewers.length);

      return () => {
        socket.off('viewer-joined', handleViewerJoined);
        socket.off('viewer-disconnected', handleViewerDisconnected);
        socket.off('viewer-left', handleViewerDisconnected);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      };
    }
  }, [socket]);

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
              
              {/* Debug bilgisi - sadece development için */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 text-sm text-gray-500">
                  Debug: Connected: {connected ? 'Yes' : 'No'} | 
                  Room: {roomId || 'None'} | 
                  Viewers: {viewers.length}
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
                  sessionStartTime={sessionStartTime}
                />
              </div>
            </div>

            {isSharing && (
              <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Wifi className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-white">Live</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-white">{viewers.length} viewers</span>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    Session active since {sessionStartTime ? new Date(sessionStartTime).toLocaleTimeString() : '--:--'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}