import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Monitor, Loader, XCircle, Maximize, Volume2 } from 'lucide-react';
import Layout from './Layout';
import RemoteViewer from './RemoteViewer';
import ChatPanel from './ChatPanel';
import useWebRTC from '../hooks/useWebRTC';
import useSocket from '../hooks/useSocket';

export default function ViewScreenComponent() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [hostId, setHostId] = useState('');
  
  const { socket } = useSocket();
  const { remoteStream, connectToPeer } = useWebRTC(socket);

  useEffect(() => {
    if (router.isReady) {
      const { room, pwd } = router.query;
      if (room && pwd) {
        setRoomId(room);
        setPassword(pwd);
        setConnecting(true);
      } else {
        router.push('/');
      }
    }
  }, [router.isReady, router.query, router]);

  useEffect(() => {
    if (socket && roomId && password && connecting) {
      joinRoom();
    }
  }, [socket, roomId, password, connecting]);

  const joinRoom = () => {
    socket.emit('join-room', { roomId, password }, (response) => {
      if (response.success) {
        setHostId(response.hostId);
        setConnected(true);
        setError('');
      } else {
        setError(response.error || 'Failed to join room');
        setConnected(false);
      }
      setConnecting(false);
    });
  };

  useEffect(() => {
    if (socket) {
      socket.on('host-disconnected', () => {
        setError('Host has disconnected');
        setConnected(false);
      });

      return () => {
        socket.off('host-disconnected');
      };
    }
  }, [socket]);

  const handleDisconnect = () => {
    if (socket) {
      socket.disconnect();
    }
    router.push('/');
  };

  if (!router.isReady) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Remote View - JustDesk</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="bg-black/50 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Monitor className="w-6 h-6 text-blue-400" />
                <h1 className="text-xl font-semibold text-white">
                  Remote Desktop View
                </h1>
                {connected && (
                  <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm">
                    Connected
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Volume2 className="w-5 h-5 text-white" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Maximize className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          {connecting ? (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <div className="text-center">
                <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                <p className="text-xl text-white">Connecting to remote desktop...</p>
                <p className="text-gray-400 mt-2">Room ID: {roomId}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-xl text-white mb-2">Connection Failed</p>
                <p className="text-gray-400 mb-6">{error}</p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-[calc(100vh-200px)]">
              <div className="flex-1">
                <RemoteViewer
                  stream={remoteStream}
                  connected={connected}
                  roomId={roomId}
                />
              </div>
              <div className="w-72">
                <ChatPanel socket={socket} className="h-full" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
