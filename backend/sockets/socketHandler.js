const Message = require('../models/Message');
const User = require('../models/User');

const onlineUsers = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        // Online status logic
        onlineUsers.set(socket.username, socket.id);
        console.log(`📡 ${socket.username} is online`);
        io.emit("online users", Array.from(onlineUsers.keys()));

        // 1. TYPING
        socket.on("typing", (data) => {
            if (data.to) {
                const recipientSocketId = onlineUsers.get(data.to);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit("user_typing", data);
                }
            } else {
                socket.to(data.roomId).emit("user_typing", data);
            }
        });

        // 2. JOIN ROOM
        socket.on("join room", (roomId) => {
            socket.join(roomId);
            console.log(`🚪 User ${socket.username} joined room: ${roomId}`);
            socket.emit("room joined", { roomId, success: true });
        });

        // 3. CHAT MESSAGE
        socket.on("chat message", async ({ roomId, msg, to }) => {
            const messageData = {
                msg,
                sender: socket.username,
                roomId,
                timestamp: Date.now(),
                seen: false,
            };

            try {
                await Message.create({
                    content: msg,
                    sender: socket.username,
                    roomId,
                    seen: false
                });
            } catch (error) {
                console.error('Database save error:', error);
            }

            if (to) {
                const recipientSocketId = onlineUsers.get(to);
                socket.emit("chat message", messageData); 

                if (recipientSocketId) {
                    io.to(recipientSocketId).emit("chat message", messageData);
                }
            } else {
                io.to(roomId).emit("chat message", messageData);
            }
        });

        // 4. MESSAGES READ
        socket.on("messages_read", async ({ roomId, reader }) => {
            const to = roomId.split("_").find(u => u !== reader);
            const recipientSocketId = onlineUsers.get(to);

            try {
                const updateResult = await Message.updateMany(
                    { roomId, sender: to, seen: false },
                    { $set: { seen: true } }
                );

                console.log(`📖 Messages in ${roomId} marked as read by ${reader}. Count: ${updateResult.modifiedCount}`);

                if (recipientSocketId) {
                    io.to(recipientSocketId).emit("messages_seen_update", { roomId });
                }
            } catch (err) {
                console.error("Database Update Error (seen status):", err);
            }
        });

        // 5. DISCONNECT
        socket.on('disconnect', () => {
            onlineUsers.delete(socket.username);
            io.emit("online users", Array.from(onlineUsers.keys()));

            if (socket.username) {
                User.findOneAndUpdate(
                    { username: socket.username },
                    { lastSeen: new Date() }
                ).catch(err => console.error('Error updating lastSeen:', err));
            }
        });
    });
};