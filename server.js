const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve all files from project root
app.use(express.static(__dirname));

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime()
  });
});

// Rooms
const rooms = new Map();

function getRoomInfo(roomCode) {
  return rooms.get(roomCode) || {
    host: null,
    guest: null
  };
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join-room", ({ roomCode }) => {
    const code = roomCode.toUpperCase().trim();

    let room = getRoomInfo(code);

    let role;

    if (!room.host) {
      role = "host";
      room.host = socket.id;
    } else if (!room.guest) {
      role = "guest";
      room.guest = socket.id;
    } else {
      socket.emit("room-full");
      return;
    }

    rooms.set(code, room);

    socket.join(code);

    socket.data.roomCode = code;
    socket.data.role = role;

    socket.emit("joined-room", {
      roomCode: code,
      role
    });

    if (room.host && room.guest) {
      io.to(room.host).emit("peer-joined", {
        initiator: true
      });

      io.to(room.guest).emit("peer-joined", {
        initiator: false
      });
    }
  });

  socket.on("signal", (data) => {
    const code = socket.data.roomCode;

    if (!code) return;

    const room = getRoomInfo(code);

    const target =
      socket.id === room.host
        ? room.guest
        : room.host;

    if (target) {
      io.to(target).emit("signal", data);
    }
  });

  socket.on("gesture-event", (data) => {
    const code = socket.data.roomCode;

    if (!code) return;

    socket.to(code).emit("gesture-event", data);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;

    if (!code) return;

    const room = getRoomInfo(code);

    if (room.host === socket.id) {
      room.host = null;
    }

    if (room.guest === socket.id) {
      room.guest = null;
    }

    if (!room.host && !room.guest) {
      rooms.delete(code);
    } else {
      rooms.set(code, room);
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});