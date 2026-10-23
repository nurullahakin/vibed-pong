// The multiplayer server: a room list, and rooms that run online matches.
// Start it with `npm run server`. Players connect over WebSocket.

import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { cleanPlayerName, cleanRoomName, randomRoomName } from '../src/game/names.js';
import { Room } from './room.js';

const PORT = Number(process.env.PORT) || 8787;
const MAX_ROOMS = 100;

const rooms = new Map(); // room id -> Room
const lobby = new Set(); // players looking at the room list, not in a room

// A plain web page at / so hosts can check the server is up
const http = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end(`Pong server: ${rooms.size} rooms\n`);
});
const wss = new WebSocketServer({ server: http, maxPayload: 1024 });

// Short room names like "K7QF", without letters that are easy to mix up
function newRoomId() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  do {
    id = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  } while (rooms.has(id));
  return id;
}

// The name the player typed, cleaned up, or a random one like "Swift Comet"
function roomName(typed) {
  return cleanRoomName(typed) || randomRoomName(new Set([...rooms.values()].map((room) => room.name)));
}

// Tells everyone looking at the room list about the rooms and how many are online
function sendRoomList() {
  const list = [...rooms.values()].map((room) => room.info());
  for (const player of lobby) player.send({ type: 'rooms', rooms: list, online: wss.clients.size });
}

function leaveRoom(player) {
  const room = player.room;
  if (!room) return;
  player.room = null;
  room.leave(player);
  if (room.players.length === 0) {
    rooms.delete(room.id);
    sendRoomList();
  }
}

let nextPlayer = 1;

wss.on('connection', (socket) => {
  const player = {
    id: nextPlayer,
    name: `Player ${nextPlayer++}`,
    room: null,
    send(message) {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    },
  };
  player.send({ type: 'welcome', name: player.name });
  sendRoomList(); // the online count changed

  socket.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }

    switch (message?.type) {
      case 'list':
        lobby.add(player);
        sendRoomList();
        break;
      case 'create': {
        if (player.room) break;
        if (rooms.size >= MAX_ROOMS) {
          player.send({ type: 'error', message: 'The server is full. Try again later.' });
          break;
        }
        const room = new Room(newRoomId(), roomName(message.name), sendRoomList);
        rooms.set(room.id, room);
        lobby.delete(player);
        player.room = room;
        room.join(player);
        break;
      }
      case 'join': {
        const room = rooms.get(String(message.room));
        if (player.room || !room || !room.join(player)) {
          player.send({ type: 'error', message: 'That room is full or gone.' });
          break;
        }
        lobby.delete(player);
        player.room = room;
        break;
      }
      case 'leave':
        leaveRoom(player);
        break;
      case 'rename-room':
        player.room?.rename(player, cleanRoomName(message.name));
        break;
      case 'name': {
        // A new name for this player. Empty or unchanged names are ignored.
        const name = cleanPlayerName(message.name);
        if (!name || name === player.name) break;
        player.name = name;
        player.send({ type: 'name', name });
        sendRoomList();
        player.room?.broadcastRoom();
        break;
      }
      case 'ready':
        player.room?.setReady(player, message.ready);
        break;
      case 'input':
        player.room?.input(player, message.dir);
        break;
      case 'ping':
        // Sent straight back, so the player can time the round trip
        if (Number.isFinite(message.time)) player.send({ type: 'pong', time: message.time });
        break;
    }
  });

  socket.on('close', () => {
    lobby.delete(player);
    leaveRoom(player);
    sendRoomList(); // the online count changed
  });
});

http.listen(PORT, () => console.log(`Pong server listening on port ${PORT}`));
