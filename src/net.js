// The connection to the multiplayer server, shared by the online scenes.
// Builds point at the server in VITE_SERVER_URL. `npm run dev` uses a local one.

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'ws://localhost:8787' : '');

// Your chosen player name is remembered in this browser. Storage can be blocked,
// for example in private windows, so it's just skipped then.
const NAME_KEY = 'pong.playerName';
const PING_EVERY = 2000; // milliseconds between pings
const storage = {
  get: () => { try { return localStorage.getItem(NAME_KEY); } catch { return null; } },
  set: (name) => { try { localStorage.setItem(NAME_KEY, name); } catch {} },
};

class Connection {
  constructor() {
    this.socket = null;
    this.handlers = new Map(); // message type -> Set of functions
    this.last = {}; // the latest message of each type, e.g. last.room
    this.name = null; // the name the server gave us, like "Player 3"
    this.ping = null; // the last round trip to the server in milliseconds, or null
  }

  get open() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // Resolves once connected, or right away if already connected
  connect() {
    if (this.open) return Promise.resolve();
    if (!SERVER_URL) return Promise.reject(new Error("Online play isn't set up yet"));
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(SERVER_URL);
      this.socket = socket;
      socket.onopen = () => {
        this.startPinging(socket);
        resolve();
      };
      socket.onerror = () => reject(new Error("Can't reach the server"));
      socket.onclose = () => {
        clearInterval(socket.pingTimer);
        this.ping = null;
        if (this.socket !== socket) return; // closed on purpose
        this.socket = null;
        this.emit({ type: 'disconnected' });
      };
      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === 'pong') this.ping = Math.round(performance.now() - message.time);
        if (message.type === 'welcome' || message.type === 'name') this.name = message.name;
        // Ask for the name chosen last time, instead of the "Player 3" the server gives
        if (message.type === 'welcome' && storage.get()) this.send({ type: 'name', name: storage.get() });
        this.emit(message);
      };
    });
  }

  // Times a round trip to the server every few seconds, for the ping indicator
  startPinging(socket) {
    const ping = () => this.send({ type: 'ping', time: performance.now() });
    ping();
    socket.pingTimer = setInterval(ping, PING_EVERY);
  }

  close() {
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }

  // Asks the server for a new name, and remembers it for next time
  setName(name) {
    storage.set(name);
    this.send({ type: 'name', name });
  }

  send(message) {
    if (this.open) this.socket.send(JSON.stringify(message));
  }

  // Calls fn for each message of this type until the scene shuts down
  listen(scene, type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    scene.events.once('shutdown', () => this.handlers.get(type).delete(fn));
  }

  emit(message) {
    this.last[message.type] = message;
    for (const fn of [...(this.handlers.get(message.type) ?? [])]) fn(message);
  }
}

export const net = new Connection();
