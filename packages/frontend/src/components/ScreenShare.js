import { useRef, useEffect } from 'react';
import { Monitor, Play, Square, AlertCircle } from 'lucide-react';

export default function ScreenShare({ stream, isSharing, onStartShare, onStopShare, error }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
        {isSharing && stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Monitor className="w-20 h-20 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-6">
                {error || "Click 'Start Sharing' to begin screen sharing"}
              </p>
              {!isSharing && (
                <button
                  onClick={onStartShare}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center mx-auto"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Sharing
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-600/90 text-white px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      {isSharing && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-medium">Screen is being shared</span>
          </div>
          <button
            onClick={onStopShare}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Sharing
          </button>
        </div>
      )}
    </div>
  );
}