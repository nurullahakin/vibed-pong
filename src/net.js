// The connection to the multiplayer server, shared by the online scenes.
// Builds point at the server in VITE_SERVER_URL. `npm run dev` uses a local one.

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'ws://localhost:8787' : '');

// Your chosen player name is remembered in this browser. Storage can be blocked,
// for example in private windows, so it's just skipped then.
const NAME_KEY = 'pong.playerName';
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
      socket.onopen = () => resolve();
      socket.onerror = () => reject(new Error("Can't reach the server"));
      socket.onclose = () => {
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
        if (message.type === 'welcome' || message.type === 'name') this.name = message.name;
        // Ask for the name chosen last time, instead of the "Player 3" the server gives
        if (message.type === 'welcome' && storage.get()) this.send({ type: 'name', name: storage.get() });
        this.emit(message);
      };
    });
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
