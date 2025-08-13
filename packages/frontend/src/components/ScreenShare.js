
import { useRef, useEffect, useState } from 'react';
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
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');


  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startRecording = () => {
    if (!stream) return;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    recorder.onstop = () => {
      setRecordedChunks(chunks);
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    };
    recorder.start();
    setIsRecording(true);
    setRecordedChunks([]);
    setDownloadUrl(null);
    setUploadStatus('');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadRecording = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const uploadRecording = async () => {
    if (!recordedChunks.length) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const base64 = await blobToBase64(blob);
    try {
      const res = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `recording-${Date.now()}.webm`,
          data: base64,
        }),
      });
      setUploadStatus(res.ok ? 'Uploaded' : 'Upload failed');
    } catch (err) {
      setUploadStatus('Upload failed');
    }
  };

  useEffect(() => {
    if (!isSharing && isRecording) {
      stopRecording();
    }
  }, [isSharing, isRecording]);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

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
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center space-x-2">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                >
                  Stop Recording
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Start Recording
                </button>
              )}
              <button
                onClick={() => {
                  if (isRecording) stopRecording();
                  onStopShare();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Sharing
              </button>
            </div>
          </div>
          {downloadUrl && !isRecording && (
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadRecording}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Download
              </button>
              <button
                onClick={uploadRecording}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
              >
                Upload
              </button>
              {uploadStatus && (
                <span className="text-sm text-gray-300">{uploadStatus}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

