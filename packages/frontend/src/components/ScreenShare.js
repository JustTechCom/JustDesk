
import { useRef, useEffect } from 'react';
import {
  Monitor,
  Play,
  Square,
  AlertCircle,
  Video,
  VideoOff,
  Mic,
  MicOff
} from 'lucide-react';

export default function ScreenShare({
  stream,
  isSharing,
  onStartShare,
  onStopShare,
  error,
  cameraEnabled,
  microphoneEnabled,
  onToggleCamera,
  onToggleMicrophone
}) {
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
                <>
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <button
                      onClick={onToggleCamera}
                      className={`p-2 rounded-full ${cameraEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={onToggleMicrophone}
                      className={`p-2 rounded-full ${microphoneEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      {microphoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    onClick={onStartShare}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center mx-auto"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Sharing
                  </button>
                </>
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
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Monitor className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm">Screen</span>
            </div>
            <div className="flex items-center space-x-1">
              {cameraEnabled ? (
                <Video className="w-4 h-4 text-green-400" />
              ) : (
                <VideoOff className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-white text-sm">Camera</span>
            </div>
            <div className="flex items-center space-x-1">
              {microphoneEnabled ? (
                <Mic className="w-4 h-4 text-green-400" />
              ) : (
                <MicOff className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-white text-sm">Mic</span>
            </div>
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

