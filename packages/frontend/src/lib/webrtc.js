import SimplePeer from 'simple-peer';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.peers = new Map();
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
  }

  async startScreenCapture(options = {}) {
    const defaultOptions = {
      video: {
        cursor: 'always',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    };

    try {
      this.localStream = await navigator.mediaDevices.getDisplayMedia({
        ...defaultOptions,
        ...options
      });

      // Add ended event listener
      this.localStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenCapture();
      });

      return this.localStream;
    } catch (error) {
      throw new Error(`Failed to capture screen: ${error.message}`);
    }
  }

  stopScreenCapture() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close all peer connections
    this.peers.forEach(peer => peer.destroy());
    this.peers.clear();
  }

  createPeer(peerId, initiator = true, stream = null) {
    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: false,
      config: this.config
    });

    this.peers.set(peerId, peer);
    return peer;
  }

  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
    }
  }

  getPeer(peerId) {
    return this.peers.get(peerId);
  }

  getAllPeers() {
    return Array.from(this.peers.entries());
  }
}

export default new WebRTCService();