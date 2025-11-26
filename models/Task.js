const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Client Meeting','Site Visit','Internal Review','Call','Follow-Up','Other'], default: 'Other' },
  date: { type: Date, required: true },
  description: { type: String, trim: true },
  customerCustId: { type: String }, // optional link to customer
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);
