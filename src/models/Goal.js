const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  dream: { type: mongoose.Schema.Types.ObjectId, ref: 'Dream', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  targetDate: { type: Date },
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  progress: { type: Number, default: 0, min: 0, max: 100 }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
