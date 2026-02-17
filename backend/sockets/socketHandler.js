const Message = require('../models/Message');
const User = require('../models/User');

const onlineUsers = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {

        if (socket.username) {
            onlineUsers.set(socket.username, socket.id);
            // Join personal room for notifications
            socket.join(socket.username);

            console.log(`📡 ${socket.username} is online (ID: ${socket.id})`);
            io.emit("online users", Array.from(onlineUsers.keys()));
        }

        // Typing event
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

        // Join room
        socket.on("join room", (roomId) => {
            socket.join(roomId);
            socket.emit("room joined", { roomId, success: true });
        });

        // Handle new message
        socket.on("chat message", async ({ roomId, msg, to }) => {
            try {
                // Save to DB
                const newMessage = await Message.create({
                    msg: msg,
                    sender: socket.username,
                    roomId,
                    timestamp: Date.now(),
                    seen: false,
                    reactions: []
                });

                let messageData = newMessage.toObject();
                messageData._id = messageData._id.toString();

                // Broadcast
                if (to) {
                    const recipientSocketId = onlineUsers.get(to);

                    // Send to sender (update UI immediately with real ID)
                    socket.emit("chat message", messageData);

                    // Send to recipient
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("chat message", messageData);
                    }
                } else {
                    // Public Room
                    io.to(roomId).emit("chat message", messageData);
                }

            } catch (error) {
                console.error('Database save error:', error);
            }
        });

        // Mark messages as read
        socket.on("messages_read", async ({ roomId, reader }) => {
            if (!reader) return;
            const to = roomId.split("_").find(u => u !== reader);
            if (!to) return;

            const recipientSocketId = onlineUsers.get(to);

            try {
                // Update only unread messages
                const updateResult = await Message.updateMany(
                    { roomId, sender: to, seen: false },
                    { $set: { seen: true } }
                );

                if (updateResult.modifiedCount > 0 && recipientSocketId) {
                    io.to(recipientSocketId).emit("messages_seen_update", { roomId });
                }
            } catch (err) {
                console.error("Database Update Error (seen status):", err);
            }
        });

        // Message reactions
        socket.on("message_reaction", async ({ messageId, roomId, emoji, user }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                const existingReactionIndex = message.reactions.findIndex(r => r.user === user);

                if (existingReactionIndex > -1) {
                    if (message.reactions[existingReactionIndex].emoji === emoji) {
                        // Remove (Toggle off)
                        message.reactions.splice(existingReactionIndex, 1);
                    } else {
                        // Change Emoji
                        message.reactions[existingReactionIndex].emoji = emoji;
                    }
                } else {
                    // Add New
                    message.reactions.push({ user, emoji });
                }

                await message.save();

                // Emit to everyone in the room (including sender)
                io.to(roomId).emit("message_reaction_update", {
                    messageId: message._id.toString(),
                    reactions: message.reactions
                });

            } catch (err) {
                console.error("Reaction Error:", err);
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            if (socket.username) {
                onlineUsers.delete(socket.username);
                io.emit("online users", Array.from(onlineUsers.keys()));

                User.findOneAndUpdate(
                    { username: socket.username },
                    { lastSeen: new Date() }
                ).catch(err => console.error('Error updating lastSeen:', err));
            }
        });
    });
};