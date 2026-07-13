const mongoose = require('mongoose');

const dreamSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, enum: ['career', 'health', 'relationships', 'finance', 'personal', 'other'], default: 'personal' },
  targetDate: { type: Date },
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  color: { type: String, default: '#6366f1' }
}, { timestamps: true });

module.exports = mongoose.model('Dream', dreamSchema);
