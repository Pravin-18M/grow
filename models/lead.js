const mongoose = require('mongoose');
module.exports = mongoose.model('Lead', new mongoose.Schema({
    name: String,
    phone: String,
    req: String,
    budget: Number,
    status: { type: String, default: 'New' } // New, Interested, Closed
}));