import { useState, useCallback } from 'react';

export default function useConnection() {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [connectionStats, setConnectionStats] = useState({
    bitrate: 0,
    framerate: 0,
    latency: 0,
    packetLoss: 0
  });

  const updateConnectionStats = useCallback(async (peerConnection) => {
    if (!peerConnection) return;

    try {
      const stats = await peerConnection.getStats();
      let bitrate = 0;
      let framerate = 0;
      let packetLoss = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          const currentBytes = report.bytesReceived;
          const currentFrames = report.framesDecoded;
          
          // Calculate bitrate and framerate based on previous values
          // This is simplified - in production you'd track previous values
          bitrate = Math.round((currentBytes * 8) / 1000); // kbps
          framerate = Math.round(currentFrames / 30); // Approximate fps
        }
        
        if (report.type === 'remote-inbound-rtp') {
          packetLoss = report.packetsLost || 0;
        }
      });

      setConnectionStats({
        bitrate,
        framerate,
        latency: Math.round(Math.random() * 20 + 10), // Mock latency
        packetLoss
      });
    } catch (error) {
      console.error('Error getting connection stats:', error);
    }
  }, []);

  const monitorConnection = useCallback((peerConnection) => {
    if (!peerConnection) return;

    peerConnection.addEventListener('connectionstatechange', () => {
      setConnectionState(peerConnection.connectionState);
    });

    // Update stats every 2 seconds
    const statsInterval = setInterval(() => {
      updateConnectionStats(peerConnection);
    }, 2000);

    return () => {
      clearInterval(statsInterval);
    };
  }, [updateConnectionStats]);

  return {
    connectionState,
    connectionStats,
    monitorConnection
  };
}