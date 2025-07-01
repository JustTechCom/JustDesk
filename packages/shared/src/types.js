/**
 * Type definitions for JustDesk
 * In a TypeScript project, these would be .ts files with proper types
 */

// Room types
const RoomTypes = {
  Room: {
    roomId: 'string',
    hostId: 'string',
    password: 'string',
    participants: 'string[]',
    created: 'number',
    lastActivity: 'number'
  },
  
  RoomStats: {
    roomId: 'string',
    created: 'Date',
    lastActivity: 'Date',
    participantCount: 'number',
    duration: 'number'
  }
};

// Connection types
const ConnectionTypes = {
  Connection: {
    socketId: 'string',
    roomId: 'string',
    role: 'host | viewer',
    joinedAt: 'number'
  },
  
  ConnectionStats: {
    bitrate: 'number',
    framerate: 'number',
    latency: 'number',
    packetLoss: 'number'
  }
};

// WebRTC types
const WebRTCTypes = {
  Offer: {
    type: 'offer',
    sdp: 'string'
  },
  
  Answer: {
    type: 'answer',
    sdp: 'string'
  },
  
  IceCandidate: {
    candidate: 'string',
    sdpMid: 'string | null',
    sdpMLineIndex: 'number | null'
  }
};

// API Response types
const ResponseTypes = {
  SuccessResponse: {
    success: 'true',
    data: 'any',
    message: 'string?'
  },
  
  ErrorResponse: {
    success: 'false',
    error: 'string',
    code: 'string?',
    details: 'any?'
  }
};

module.exports = {
  RoomTypes,
  ConnectionTypes,
  WebRTCTypes,
  ResponseTypes
};