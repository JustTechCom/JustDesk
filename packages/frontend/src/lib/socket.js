import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(url, options = {}) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...options
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  setupDefaultListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.emit('client-ready');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  on(event, callback) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    
    this.socket.on(event, callback);
    
    // Track listeners for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
      
      // Remove from tracked listeners
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  emit(event, ...args) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit(event, ...args);
  }

  disconnect() {
    if (this.socket) {
      // Remove all tracked listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();
      
      this.socket.disconnect();
      this.socket = null;
    }
  }

  get connected() {
    return this.socket?.connected || false;
  }

  get id() {
    return this.socket?.id || null;
  }
}

export default new SocketService();