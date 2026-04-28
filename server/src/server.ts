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
            };
        }

        const user = { id: socket.id, name };

        // rooms[roomId].users.push(user);
        rooms[roomId].users = rooms[roomId].users.filter(
            (u) => u.id !== socket.id
        );

        rooms[roomId].users.push(user);

        socket.join(roomId);

        console.log(`${name} joined room ${roomId}`);

        // Send updated room state to all users in room
        io.to(roomId).emit("ROOM_UPDATE", rooms[roomId]);
    });

    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (!room || !room.users) continue;

            room.users = room.users.filter(
                (user) => user.id !== socket.id
            );


            io.to(roomId).emit("ROOM_UPDATE", rooms[roomId]);
        }

        console.log("Disconnected", socket.id);
    });
});


app.get("/", (req, res) => {
    res.send("hello")
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log("server running PORT no", PORT)
})
