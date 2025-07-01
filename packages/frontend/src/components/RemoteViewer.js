import { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, Volume2, VolumeX, Download } from 'lucide-react';

export default function RemoteViewer({ stream, connected, roomId }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [quality, setQuality] = useState('auto');

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const takeScreenshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      const link = document.createElement('a');
      link.download = `screenshot-${roomId}-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden">
      {connected && stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          />
          
          {/* Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleMute}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                </button>
                
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="bg-white/20 text-white px-3 py-2 rounded-lg backdrop-blur-sm border border-white/10 focus:outline-none focus:border-white/30"
                >
                  <option value="auto">Auto Quality</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={takeScreenshot}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Take Screenshot"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5 text-white" /> : <Maximize2 className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[calc(100vh-200px)] bg-gray-900">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="w-20 h-20 bg-gray-700 rounded-lg mx-auto mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-48 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}