module.exports = {
  // Event names
  EVENTS: {
    // Socket events
    CREATE_ROOM: 'create-room',
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',
    ROOM_CREATED: 'room-created',
    ROOM_JOINED: 'room-joined',
    ROOM_LEFT: 'room-left',
    ROOM_CLOSED: 'room-closed',
    
    // WebRTC events
    OFFER: 'offer',
    ANSWER: 'answer',
    ICE_CANDIDATE: 'ice-candidate',
    
    // Participant events
    VIEWER_JOINED: 'viewer-joined',
    VIEWER_LEFT: 'viewer-left',
    VIEWER_DISCONNECTED: 'viewer-disconnected',
    HOST_DISCONNECTED: 'host-disconnected',
    
    // Error events
    ERROR: 'error',
    CONNECTION_ERROR: 'connection-error',
    ROOM_ERROR: 'room-error'
  },
  
  // Room constraints
  ROOM: {
    MAX_VIEWERS: 10,
    ID_LENGTH: 9,
    PASSWORD_LENGTH: 6,
    SESSION_TIMEOUT: 3600000, // 1 hour in milliseconds
    MIN_ID: 100000000,
    MAX_ID: 999999999
  },
  
  // WebRTC constraints
  WEBRTC: {
    VIDEO: {
      MAX_WIDTH: 1920,
      MAX_HEIGHT: 1080,
      MAX_FRAMERATE: 30,
      MIN_FRAMERATE: 15
    },
    AUDIO: {
      ECHO_CANCELLATION: true,
      NOISE_SUPPRESSION: true,
      AUTO_GAIN_CONTROL: true,
      SAMPLE_RATE: 44100
    }
  },
  
  // Error codes
  ERROR_CODES: {
    ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
    INVALID_PASSWORD: 'INVALID_PASSWORD',
    ROOM_FULL: 'ROOM_FULL',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    WEBRTC_ERROR: 'WEBRTC_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
  },
  
  // Connection states
  CONNECTION_STATES: {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    FAILED: 'failed',
    CLOSED: 'closed'
  },
  
  // User roles
  ROLES: {
    HOST: 'host',
    VIEWER: 'viewer'
  }
};