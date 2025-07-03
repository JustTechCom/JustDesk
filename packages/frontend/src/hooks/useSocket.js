import { useState, useEffect } from 'react';
import io from 'socket.io-client';

export default function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Backend URL'ini environment variable'dan al
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                      process.env.NEXT_PUBLIC_WS_URL || 
                      'http://localhost:3001';
    
    console.log('🔌 Backend URL:', backendUrl);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔧 All env vars:', {
      API_URL: process.env.NEXT_PUBLIC_API_URL,
      WS_URL: process.env.NEXT_PUBLIC_WS_URL
    });
    
    const newSocket = io(backendUrl, {
      transports: ['polling', 'websocket'], // Polling'i önce dene
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: false
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected to:', backendUrl);
      console.log('🆔 Socket ID:', newSocket.id);
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      console.error('🔍 Trying to connect to:', backendUrl);
      setError(error.message);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('🔄❌ Socket reconnect error:', error);
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  return { socket, connected, error };
}
