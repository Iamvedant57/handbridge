const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Track rooms: roomCode -> { host: socketId, guest: socketId }
const rooms = new Map();

function getRoomInfo(roomCode) {
  return rooms.get(roomCode) || { host: null, guest: null };
}

io.on("connection", (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // Join or create a room
  socket.on("join-room", ({ roomCode, role }) => {
    const code = roomCode.toUpperCase().trim();
    const room = getRoomInfo(code);

    // Decide role
    let assignedRole = null;

    if (!room.host && !room.guest) {
      // First person → host
      assignedRole = "host";
      rooms.set(code, { host: socket.id, guest: null });
    } else if (room.host && !room.guest && socket.id !== room.host) {
      // Second person → guest
      assignedRole = "guest";
      rooms.set(code, { host: room.host, guest: socket.id });
    } else if (room.host && room.guest) {
      socket.emit("room-full", { roomCode: code });
      return;
    } else {
      // Reconnect as host
      assignedRole = "host";
      rooms.set(code, { host: socket.id, guest: room.guest });
    }

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = assignedRole;

    socket.emit("joined-room", { roomCode: code, role: assignedRole });
    console.log(`[Room ${code}] ${assignedRole} joined (${socket.id})`);

    // Notify the other peer if both are now in the room
    const updated = getRoomInfo(code);
    if (updated.host && updated.guest) {
      io.to(updated.host).emit("peer-joined", { initiator: true });
      io.to(updated.guest).emit("peer-joined", { initiator: false });
      console.log(`[Room ${code}] Both peers connected — signaling ready`);
    }
  });

  // WebRTC signaling relay
  socket.on("signal", (data) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = getRoomInfo(code);

    // Forward to the other peer
    const targetId =
      socket.id === room.host ? room.guest : room.host;

    if (targetId) {
      io.to(targetId).emit("signal", data);
    }
  });

  // Chat / gesture events relay
  socket.on("gesture-event", (data) => {
    const code = socket.data.roomCode;
    if (!code) return;
    socket.to(code).emit("gesture-event", data);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    console.log(`[-] Disconnected: ${socket.id}`);
    if (!code) return;

    const room = getRoomInfo(code);
    if (room.host === socket.id) {
      rooms.set(code, { host: null, guest: room.guest });
      if (room.guest) io.to(room.guest).emit("peer-disconnected");
    } else if (room.guest === socket.id) {
      rooms.set(code, { host: room.host, guest: null });
      if (room.host) io.to(room.host).emit("peer-disconnected");
    }

    // Clean up empty rooms
    const updated = getRoomInfo(code);
    if (!updated.host && !updated.guest) {
      rooms.delete(code);
      console.log(`[Room ${code}] Removed (empty)`);
    }
  });
});

// Health check
app.get("/health", (req, res) =>
  res.json({ status: "ok", rooms: rooms.size })
);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
