const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    msg: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
    },
    sender: {
        type: String,
        required: true,
    },
    roomId: {
        type: String,
        required: true,
        index: true,
    },
    timestamp: {
        type: Number, 
        default: Date.now,
        index: true, 
    },
    seen: { type: Boolean, default: false },
    reactions: [
        {
            user: { type: String, required: true },
            emoji: { type: String, required: true }
        }
    ]
});

messageSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id;
        ret._id = ret.id; 
    }
});

messageSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);