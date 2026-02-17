const User = require('../models/User');

// Helper to get socket ID (this logic should ideally be shared or better structured)
// For now, we need to access `onlineUsers` from socketHandler. 
// Since we can't easily import `onlineUsers` map effectively without refactoring, 
// we will rely on `io.emit` to everyone (inefficient) OR we can use `io.to(socketId)` if we knew it.
// BETTER: Let's use `io` to emit to a room named after the userId?
// We haven't set up user rooms. 
// Alternative: We can fetch sockets by username if we had a way.
// QUICK FIX: In socketHandler, we can make users join a room with their own username/ID.
// Then `io.to(userId).emit(...)` works.
// Let's modify socketHandler first to join `socket.join(userId)` or `socket.join(username)`.

const sendFriendRequest = async (req, res) => {
    try {
        const { toUsername } = req.body;
        const fromUserId = req.user.id;
        const fromUsername = req.user.username;

        const targetUser = await User.findOne({ username: toUsername });
        if (!targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        if (targetUser._id.toString() === fromUserId) {
            return res.status(400).json({ error: "Cannot send request to yourself" });
        }

        // Check if already friends
        if (targetUser.friends.includes(fromUserId)) {
            return res.status(400).json({ error: "Already friends" });
        }

        // Check if request already pending
        const existingRequest = targetUser.friendRequests.find(
            req => req.from.toString() === fromUserId && req.status === 'pending'
        );

        if (existingRequest) {
            return res.status(400).json({ error: "Request already sent" });
        }

        // Check if target has already sent a request to ME (Bi-directional check)
        // If so, we could auto-accept. But for now, let's just block and say "Check your requests"
        // OR better, just let it be strictly "Request/Accept".
        // If I request B, and B requests A, both see requests.
        // If A accepts B, they become friends.
        // B's request to A is still pending in A's list?
        // We need to handle this in ACCEPT.

        targetUser.friendRequests.push({ from: fromUserId, status: 'pending' });
        await targetUser.save();

        // Real-time Event
        // We need to emit to `targetUser.username`
        // Assuming we update socketHandler to join room `username`
        req.io.to(targetUser.username).emit('friend_request', {
            _id: fromUserId,
            username: fromUsername
        });

        res.json({ success: true, message: "Friend request sent" });
    } catch (err) {
        console.error("Send Request Error:", err);
        res.status(500).json({ error: "Failed to send request" });
    }
};

const acceptFriendRequest = async (req, res) => {
    try {
        const { fromUserId } = req.body;
        const userId = req.user.id; // Me
        const myUsername = req.user.username;

        const user = await User.findById(userId); // Me
        const sender = await User.findById(fromUserId); // Them

        if (!user || !sender) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if request exists
        const requestIdx = user.friendRequests.findIndex(
            req => req.from.toString() === fromUserId && req.status === 'pending'
        );

        if (requestIdx === -1) {
            return res.status(400).json({ error: "No pending request found" });
        }

        // Prevent Duplicates
        if (!user.friends.includes(fromUserId)) {
            user.friends.push(fromUserId);
        }
        if (!sender.friends.includes(userId)) {
            sender.friends.push(userId);
        }

        // Remove the incoming request
        user.friendRequests.splice(requestIdx, 1);

        // CLEANUP: Remove any pending request FROM ME to THEM (if exists)
        // This solves the "Double Request -> Double Friend" race condition
        const outgoingRequestIdx = sender.friendRequests.findIndex(
            req => req.from.toString() === userId && req.status === 'pending'
        );
        if (outgoingRequestIdx !== -1) {
            sender.friendRequests.splice(outgoingRequestIdx, 1);
        }

        await user.save();
        await sender.save();

        // Real-time Event
        // Configure socketHandler to join `userId` or `username`. 
        // Let's use `username` for consistency with current code.
        req.io.to(sender.username).emit('friend_accepted', {
            username: myUsername,
            _id: userId
        });

        res.json({ success: true, message: "Friend request accepted" });
    } catch (err) {
        console.error("Accept Request Error:", err);
        res.status(500).json({ error: "Failed to accept request" });
    }
};

const declineFriendRequest = async (req, res) => {
    try {
        const { fromUserId } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);

        user.friendRequests = user.friendRequests.filter(
            req => !(req.from.toString() === fromUserId && req.status === 'pending')
        );

        await user.save();

        res.json({ success: true, message: "Friend request declined" });
    } catch (err) {
        console.error("Decline Request Error:", err);
        res.status(500).json({ error: "Failed to decline request" });
    }
};

const getFriends = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId)
            .populate('friends', 'username lastSeen')
            .populate('friendRequests.from', 'username');

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const pendingRequests = user.friendRequests
            .filter(req => req.status === 'pending')
            .map(req => req.from);

        res.json({
            friends: user.friends,
            pendingRequests
        });
    } catch (err) {
        console.error("Get Friends Error:", err);
        res.status(500).json({ error: "Failed to fetch friends" });
    }
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    getFriends
};
