const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors({ origin: '*' }));

const players = {};
const activeConnections = new Map()

io.on("connection", (socket) => {
    const username = socket.handshake.query.username;
    const peerJSId = socket.handshake.query.peerJSId;
    
    if (!username || !peerJSId) {
        console.log("Rejecting connection - no username provided");
        socket.disconnect();
        return;
    }

    console.log(`New player connected: ${username} (${socket.id}) ${peerJSId}`);
    
    // Add the new player with all necessary data
    players[socket.id] = {
        x: 400,
        y: 1050,
        username: username,
        animation: null,
        peerJSId:peerJSId
    };

    // Emit the current state to the new player
    io.emit("playerConnected", {
        id: socket.id,
        players: players
    });

    socket.on("playerMove", (data) => {
        if (players[socket.id]) {
            players[socket.id] = {
                ...players[socket.id],
                x: data.x,
                y: data.y,
                animation: data.animation
            };
            
            io.emit("playerMoved", {
                id: socket.id,
                x: data.x,
                y: data.y,
                animation: data.animation
            });
        }
    });

    // socket.on("webrtc-offer",(data)=>{
    //     if(players[data.to]){
    //         io.to(data.to).emit("webrtc-offer",{
    //             offer:data.offer,
    //             from:socket.id
    //         })
    //     }
    // })
    // socket.on("webrtc-answer",(data)=>{
    //     if(players[data.to]){
    //         io.to(data.to).emit("webrtc-answer",{
    //             answer:data.answer,
    //             from:socket.id
    //         })
    //     }
    // })

    // socket.on("webrtc-ice-candidate",(data)=>{
    //     if(players[data.to]){
    //         io.to(data.to).emit("webrtc-ice-candidate",{
    //             candidate:data.candidate,
    //             from:socket.id
    //         })
    //     }
    // })
    socket.on("endCall", (peerId) => {
        io.to(peerId).emit("callEnded", socket.id);
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        if (players[socket.id]) {
            delete players[socket.id];
            io.emit("playerDisconnected", socket.id);
        }
    });
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});