const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dream: { type: mongoose.Schema.Types.ObjectId, ref: 'Dream' },
  dreamTime: { type: mongoose.Schema.Types.ObjectId, ref: 'DreamTime' },
  plannedMinutes: { type: Number, default: 25, min: 1 },
  elapsedSeconds: { type: Number, default: 0 },
  startedAt: { type: Date },
  endedAt: { type: Date },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
