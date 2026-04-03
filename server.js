const express = require('express');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// rooms: { roomId: { hostWs, guestWs } }
const rooms = new Map();
// ws -> { roomId, role }
const clients = new Map();

function send(ws, data) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws) => {
  ws.id = uuidv4();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create-room': {
        const roomId = uuidv4().slice(0, 8).toUpperCase();
        rooms.set(roomId, { host: ws, guest: null });
        clients.set(ws, { roomId, role: 'host' });
        send(ws, { type: 'room-created', roomId });
        break;
      }

      case 'join-room': {
        const { roomId } = msg;
        const room = rooms.get(roomId);
        if (!room) {
          send(ws, { type: 'error', message: 'Room not found' });
          return;
        }
        if (room.guest) {
          send(ws, { type: 'error', message: 'Room is full' });
          return;
        }
        room.guest = ws;
        clients.set(ws, { roomId, role: 'guest' });
        send(ws, { type: 'room-joined', roomId });
        // Tell host that guest joined — host initiates offer
        send(room.host, { type: 'peer-joined' });
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const info = clients.get(ws);
        if (!info) return;
        const room = rooms.get(info.roomId);
        if (!room) return;
        const target = info.role === 'host' ? room.guest : room.host;
        send(target, msg);
        break;
      }

      case 'leave': {
        handleLeave(ws);
        break;
      }
    }
  });

  ws.on('close', () => handleLeave(ws));
});

function handleLeave(ws) {
  const info = clients.get(ws);
  if (!info) return;
  clients.delete(ws);
  const room = rooms.get(info.roomId);
  if (!room) return;
  const other = info.role === 'host' ? room.guest : room.host;
  send(other, { type: 'peer-left' });
  rooms.delete(info.roomId);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`VoiceBridge running on http://localhost:${PORT}`));
