class WebSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnect = 10;
    this.reconnectDelay = 2000;
  }

  connect() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${location.host}/ws`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connection', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.emit(msg.type, msg.data);
          this.emit('*', msg);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.emit('connection', { connected: false });
        this.tryReconnect();
      };

      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch (e) {
      console.error('[WS] Connect error:', e);
      this.tryReconnect();
    }
  }

  tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnect) return;
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type)?.delete(callback);
  }

  emit(type, data) {
    this.listeners.get(type)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[WS] Listener error:', e); }
    });
  }

  isConnected() {
    return this.connected;
  }
}

export const ws = new WebSocketClient();
