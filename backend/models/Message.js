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
        type: Number, // Date-ის ნაცვლად Number (Date.now()) უფრო ზუსტია სორტირებისთვის JS-ში
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

// ეს უზრუნველყოფს, რომ როცა მესიჯს სოკეტზე აგზავნი, _id იყოს string და არა Object
messageSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id; // _id-ს შლის, რადგან id (virtual) უკვე აქვს, ან დატოვე როგორც გინდა
        ret._id = ret.id; // ან პირიქით, _id გახდეს string
    }
});

messageSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);