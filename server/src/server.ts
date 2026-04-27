import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    },
});

io.on("connection", (socket) => {
    console.log("Connected", socket.id)

    socket.on("disconnect", () => {
        console.log("Disconnected", socket.id)
    });
});


app.get("/", (req, res) => {
    res.send("hello")
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log("server running PORT no", PORT)
})

