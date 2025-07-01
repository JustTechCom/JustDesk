import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Wifi, Users } from 'lucide-react';
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
  
  const { socket, connected } = useSocket();
  const { startScreenShare, stopScreenShare, stream } = useWebRTC(socket);

  useEffect(() => {
    if (connected && !roomId) {
      createRoom();
    }
  }, [connected, roomId]);

  const createRoom = () => {
    socket.emit('create-room', (response) => {
      if (response.success) {
        // Burada roomId ve password mutlaka string olmalı.
        setRoomId(String(response.roomId));
        setPassword(String(response.password));
      } else {
        setError(response.error || 'Failed to create room');
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
      socket.on('viewer-joined', ({ viewerId }) => {
        setViewers(prev => [...prev, { id: viewerId, joinedAt: Date.now() }]);
      });

      socket.on('viewer-disconnected', ({ viewerId }) => {
        setViewers(prev => prev.filter(v => v.id !== viewerId));
      });
    }

    return () => {
      if (socket) {
        socket.off('viewer-joined');
        socket.off('viewer-disconnected');
      }
    };
  }, [socket]);

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
                    Room expires in 59:45
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
