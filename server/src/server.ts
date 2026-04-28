import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { rooms } from "./rooms";

const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    },
});

io.on("connection", (socket) => {
    console.log("Connected", socket.id)

    //room joining
    socket.on("JOIN_ROOM", ({ roomId, name }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = {
                id: roomId,
                users: [],
                queue: [],
                currentDJ: null,
                currentSong: null,
                votes: {}
            };
        }

        const room = rooms[roomId];
        if (!room.votes) {
            room.votes = {};
        }
        const user = { id: socket.id, name };

        // rooms[roomId].users.push(user);
        room.users = room.users.filter(
            (u) => u.id !== socket.id
        );

        room.queue = room.queue.filter((id) => id !== socket.id)

        room.users.push(user);
        room.queue.push(socket.id);

        if (!room.currentDJ) {
            room.currentDJ = socket.id;
        }

        socket.join(roomId);

        // Send updated room state to all users in room
        io.to(roomId).emit("ROOM_UPDATE", rooms[roomId]);
    });

    socket.on("NEXT_TURN", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        // only current DJ can trigger
        if (room.currentDJ !== socket.id) return;

        // rotate queue
        const first = room.queue.shift(); // remove first
        if (first) {
            room.queue.push(first); // add to end
        }

        // update DJ
        room.currentDJ = room.queue[0] || null;

        io.to(roomId).emit("ROOM_UPDATE", room);
    });

    socket.on("PLAY_SONG", ({ roomId, song }) => {
        const room = rooms[roomId];
        if (!room) return;

        // only DJ can play
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

    socket.on("VOTE", ({ roomId, vote }) => {
        const room = rooms[roomId];
        if (!room) return;

        room.votes[socket.id] = vote;

        const totalUsers = room.users.length;

        const skipVotes = Object.values(room.votes).filter(
            (v) => v === "skip"
        ).length;

        // threshold: 50%
        if (skipVotes > totalUsers / 2) {
            // trigger next turn
            const first = room.queue.shift();
            if (first) room.queue.push(first);

            room.currentDJ = room.queue[0] || null;
            room.currentSong = null;
            room.votes = {};
        }

        io.to(roomId).emit("ROOM_UPDATE", room);
    });

    socket.on("disconnect", () => {

        Object.values(rooms).forEach((room) => {
            room.users = room.users.filter((user) => user.id != socket.id);
            room.queue = room.queue.filter((id) => id != socket.id);
            delete room.votes[socket.id];

            if (room.currentDJ === socket.id) {
                room.currentDJ = room.queue[0] || null;
            }

            io.to(room.id).emit("ROOM_UPDATE", room);
        })
    })
});


app.get("/", (req, res) => {
    res.send("hello")
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log("server running PORT no", PORT)
})
