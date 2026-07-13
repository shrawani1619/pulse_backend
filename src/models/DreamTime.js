const mongoose = require('mongoose');

const dreamTimeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dream: { type: mongoose.Schema.Types.ObjectId, ref: 'Dream', required: true },
  title: { type: String, default: 'Dream Time' },
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "10:30"
  notes: { type: String, default: '' },
  status: { type: String, enum: ['planned', 'completed', 'missed'], default: 'planned' }
}, { timestamps: true });

module.exports = mongoose.model('DreamTime', dreamTimeSchema);
