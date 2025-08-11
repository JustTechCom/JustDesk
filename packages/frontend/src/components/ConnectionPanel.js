import { useState, useEffect } from 'react';
import { Copy, CheckCircle, Users, Lock, Clock, Share2 } from 'lucide-react';

export default function ConnectionPanel({
  roomId,
  password,
  viewers,
  isSharing,
  sharingStartTime,
}) {
  const [copiedField, setCopiedField] = useState('');
  const [sessionDuration, setSessionDuration] = useState('--:--');

  const copyToClipboard = async (text, field) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      alert('Failed to copy to clipboard');
    }
  };

  const shareLink = () => {
    const url = `${window.location.origin}/view?room=${roomId}&pwd=${password}`;
    copyToClipboard(url, 'link');
  };

  // Gerçek zamanlı süre hesaplama - SADECE sharing başladığında
  useEffect(() => {
    if (!isSharing || !sharingStartTime) {
      setSessionDuration('--:--');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - sharingStartTime;

      const elapsedMinutes = Math.floor(elapsed / (1000 * 60));
      const elapsedSeconds = Math.floor((elapsed % (1000 * 60)) / 1000);
      setSessionDuration(`${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isSharing, sharingStartTime]);

  return (
    <div className="space-y-6">
      {/* Connection Info */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">Connection Details</h2>

        <div className="space-y-4">
          {/* Room ID */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Room ID</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 font-mono text-white">
                {roomId || 'Generating...'}
              </div>
              <button
                onClick={() => copyToClipboard(roomId, 'roomId')}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                disabled={!roomId}
              >
                {copiedField === 'roomId' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Password</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 font-mono text-white flex items-center">
                <Lock className="w-4 h-4 text-gray-400 mr-2" />
                {password || 'Generating...'}
              </div>
              <button
                onClick={() => copyToClipboard(password, 'password')}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                disabled={!password}
              >
                {copiedField === 'password' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Share Link */}
          <button
            onClick={shareLink}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center"
            disabled={!roomId || !password}
          >
            {copiedField === 'link' ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Link Copied!
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5 mr-2" />
                Copy Share Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">Session Info</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-400 mr-2" />
              <span className="text-gray-300">Viewers</span>
            </div>
            <span className="text-white font-medium">
              {Array.isArray(viewers) ? viewers.length : 0}
            </span>
          </div>

          {/* Session Duration - Sharing başladığından bu yana geçen süre */}
          {isSharing && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-400 mr-2" />
                <span className="text-gray-300">Session Duration</span>
              </div>
              <span className="text-white font-medium">{sessionDuration}</span>
            </div>
          )}
        </div>

        {/* Session Status */}
        {!isSharing && roomId && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center text-sm text-gray-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
              <span>Waiting for screen sharing to start...</span>
            </div>
          </div>
        )}

        {/* Viewer List */}
        {Array.isArray(viewers) && viewers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-2">Connected Viewers:</p>
            <div className="space-y-1">
              {viewers.map((viewer, index) => (
                <div key={viewer.id || index} className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-gray-300">
                    {viewer.name ||
                      `Viewer ${viewer.id ? viewer.id.substring(0, 8) : `#${index + 1}`}`}
                  </span>
                  {viewer.joinedAt && (
                    <span className="text-gray-500 ml-2 text-xs">
                      {new Date(viewer.joinedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isSharing && roomId && (
        <div className="bg-yellow-600/20 backdrop-blur-lg rounded-xl p-4 border border-yellow-400/30">
          <p className="text-sm text-yellow-200">
            <strong>Ready to share!</strong> Click "Start Sharing" to begin your screen sharing
            session. The 1-hour timer will start when you begin sharing.
          </p>
        </div>
      )}

      {isSharing && (
        <div className="bg-blue-600/20 backdrop-blur-lg rounded-xl p-4 border border-blue-400/30">
          <p className="text-sm text-blue-200">
            <strong>Live Session Active!</strong> Share the Room ID and Password with people you
            want to give access to your screen. The session will expire after 1 hour of sharing.
          </p>
        </div>
      )}
    </div>
  );
}
