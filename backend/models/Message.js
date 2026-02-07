const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content : {
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
        type: Date,
        default: Date.now,
        index: true, // ← sorting-ისთვის
  },
  seen: { type: Boolean, default: false }
})

messageSchema.index({ roomId: 1, timestamp: -1 });
module.exports = mongoose.model('Message', messageSchema);