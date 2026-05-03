import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { rooms, Room } from "./rooms";

// =========================
// 🔹 SERVER SETUP
// =========================
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// =========================
// 🔹 DJ TIMER (INACTIVITY HANDLING)
// =========================
function startDJTimer(room: Room, io: Server, roomId: string) {
  const currentDJ = room.currentDJ;
  if (!currentDJ) return;

  setTimeout(() => {
    // If DJ hasn't played anything → rotate
    if (room.currentDJ === currentDJ && !room.currentSong) {
      const first = room.queue.shift();
      if (first) room.queue.push(first);

      room.currentDJ = room.queue[0] || null;

      io.to(roomId).emit("ROOM_UPDATE", room);

      // restart timer for next DJ
      startDJTimer(room, io, roomId);
    }
  }, 15000); // 15 seconds
}

// =========================
// 🔹 SONG END HANDLER
// =========================
function handleSongEnd(room: Room, io: Server, roomId: string) {
  const likes = Object.values(room.votes).filter((v) => v === "like").length;
  const skips = Object.values(room.votes).filter((v) => v === "skip").length;

  const djId = room.currentDJ;

  // 🎯 Score update
  if (djId && room.scores[djId] !== undefined) {
    if (likes >= skips) {
      room.scores[djId] += 10;
    } else {
      room.scores[djId] -= 5;
    }
  }

  // 🔁 Rotate DJ
  const first = room.queue.shift();
  if (first) room.queue.push(first);

  room.currentDJ = room.queue[0] || null;

  // 🧹 Reset room state
  room.currentSong = null;
  room.votes = {};

  io.to(roomId).emit("ROOM_UPDATE", room);

  // ⏱ Start inactivity timer for next DJ
  startDJTimer(room, io, roomId);
}

// =========================
// 🔹 SOCKET CONNECTION
// =========================
io.on("connection", (socket) => {

  // =========================
  // 🔹 JOIN ROOM
  // =========================
  socket.on("JOIN_ROOM", ({ roomId, name }) => {
    // Create room if not exists
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        users: [],
        queue: [],
        currentDJ: null,
        currentSong: null,
        votes: {},
        scores: {},
      };
    }

    const room = rooms[roomId];

    // Initialize user score
    if (!room.scores[socket.id]) {
      room.scores[socket.id] = 0;
    }

    const user = { id: socket.id, name };

    // Remove duplicates (safety)
    room.users = room.users.filter((u) => u.id !== socket.id);
    room.queue = room.queue.filter((id) => id !== socket.id);

    // Add user
    room.users.push(user);
    room.queue.push(socket.id);

    // Assign DJ if none
    if (!room.currentDJ) {
      room.currentDJ = socket.id;
    }

    socket.join(roomId);

    // Send state
    socket.emit("ROOM_UPDATE", room);
    io.to(roomId).emit("ROOM_UPDATE", room);
  });

  // =========================
  // 🔹 NEXT TURN (MANUAL DJ SKIP)
  // =========================
  socket.on("NEXT_TURN", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.currentDJ !== socket.id) return;

    const first = room.queue.shift();
    if (first) room.queue.push(first);

    room.currentDJ = room.queue[0] || null;

    io.to(roomId).emit("ROOM_UPDATE", room);
  });

  // =========================
  // 🔹 PLAY SONG
  // =========================
  socket.on("PLAY_SONG", ({ roomId, song }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Only DJ can play
    if (room.currentDJ !== socket.id) return;

    const startAt = Date.now();

    room.votes = {};
    room.currentSong = {
      ...song,
      addedBy: socket.id,
      startAt,
    };

    io.to(roomId).emit("PLAY_SONG", room.currentSong);
    io.to(roomId).emit("ROOM_UPDATE", room);
  });

  // =========================
  // 🔹 VOTING SYSTEM
  // =========================
  socket.on("VOTE", ({ roomId, vote }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.votes[socket.id] = vote;

    const totalUsers = room.users.length;

    const skipVotes = Object.values(room.votes).filter(
      (v) => v === "skip"
    ).length;

    // Majority skip → end song
    if (skipVotes > totalUsers / 2) {
      handleSongEnd(room, io, roomId);
    }

    io.to(roomId).emit("ROOM_UPDATE", room);
  });

  // =========================
  // 🔹 SONG COMPLETED
  // =========================
  socket.on("SONG_ENDED", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    handleSongEnd(room, io, roomId);
  });

  // =========================
  // 🔹 DISCONNECT
  // =========================
  socket.on("disconnect", () => {
    Object.values(rooms).forEach((room) => {
      room.users = room.users.filter((u) => u.id !== socket.id);
      room.queue = room.queue.filter((id) => id !== socket.id);

      delete room.votes[socket.id];

      // If DJ left → assign next
      if (room.currentDJ === socket.id) {
        room.currentDJ = room.queue[0] || null;
      }

      io.to(room.id).emit("ROOM_UPDATE", room);
    });
  });
});

// =========================
// 🔹 BASIC ROUTE
// =========================
app.get("/", (req, res) => {
  res.send("SyncRoom server running");
});

// =========================
// 🔹 START SERVER
// =========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});