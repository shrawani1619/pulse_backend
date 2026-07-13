const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', required: true },
  goal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  scheduledDate: { type: Date },
  completedAt: { type: Date },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  duration: { type: Number, default: 30 }
}, { timestamps: true });

module.exports = mongoose.model('Action', actionSchema);
