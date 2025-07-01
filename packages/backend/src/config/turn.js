const config = require('./index');

module.exports = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'stun:stun1.l.google.com:19302'
    },
    {
      urls: process.env.TURN_URL || 'turn:turn.justtech.work:3478',
      username: process.env.TURN_USERNAME || 'justdesk',
      credential: process.env.TURN_PASSWORD || 'change-this-password'
    }
  ],
  iceCandidatePoolSize: 10
};