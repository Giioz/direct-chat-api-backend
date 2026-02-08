const Message = require('../models/Message');

const getMessageHistory = async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Message
            .find({ roomId })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        messages.reverse();

        res.json({
            success: true,
            messages: messages.map(msg => ({
                _id: msg._id,
                msg: msg.msg,
                sender: msg.sender,
                roomId: msg.roomId,
                timestamp: new Date(msg.timestamp).getTime(),
                seen: msg.seen || false,
                reactions: msg.reactions || []
            })),
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { getMessageHistory };