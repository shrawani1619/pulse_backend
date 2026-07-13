const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Achievement = require('../models/Achievement');
const Dream = require('../models/Dream');
const Goal = require('../models/Goal');
const Milestone = require('../models/Milestone');
const Action = require('../models/Action');
const FocusSession = require('../models/FocusSession');
const DreamTime = require('../models/DreamTime');

router.use(protect);

const CATALOG = [
  { key: 'first_dream', title: 'Dreamer', description: 'Created your first dream', icon: '⭐',
    check: async (uid) => (await Dream.countDocuments({ user: uid })) >= 1 },
  { key: 'first_goal', title: 'Goal Setter', description: 'Created your first goal', icon: '🎯',
    check: async (uid) => (await Goal.countDocuments({ user: uid })) >= 1 },
  { key: 'first_milestone', title: 'Milestone Maker', description: 'Created your first milestone', icon: '🚩',
    check: async (uid) => (await Milestone.countDocuments({ user: uid })) >= 1 },
  { key: 'first_action', title: 'Doer', description: 'Created your first daily action', icon: '✅',
    check: async (uid) => (await Action.countDocuments({ user: uid })) >= 1 },
  { key: 'five_actions_done', title: 'Momentum', description: 'Completed 5 actions', icon: '⚡',
    check: async (uid) => (await Action.countDocuments({ user: uid, status: 'completed' })) >= 5 },
  { key: 'first_focus', title: 'Deep Worker', description: 'Completed a focus session', icon: '🧘',
    check: async (uid) => (await FocusSession.countDocuments({ user: uid, status: 'completed' })) >= 1 },
  { key: 'first_dream_time', title: 'Time Guardian', description: 'Completed a Dream Time block', icon: '⏰',
    check: async (uid) => (await DreamTime.countDocuments({ user: uid, status: 'completed' })) >= 1 },
  { key: 'dream_completed', title: 'Vision Realized', description: 'Marked a dream as completed', icon: '🌈',
    check: async (uid) => (await Dream.countDocuments({ user: uid, status: 'completed' })) >= 1 },
];

async function syncAchievements(userId) {
  const unlocked = [];
  for (const item of CATALOG) {
    const exists = await Achievement.findOne({ user: userId, key: item.key });
    if (exists) continue;
    const ok = await item.check(userId);
    if (ok) {
      const created = await Achievement.create({
        user: userId,
        key: item.key,
        title: item.title,
        description: item.description,
        icon: item.icon
      });
      unlocked.push(created);
    }
  }
  return unlocked;
}

router.get('/', async (req, res, next) => {
  try {
    await syncAchievements(req.user._id);
    const unlocked = await Achievement.find({ user: req.user._id }).sort('-unlockedAt');
    const unlockedKeys = new Set(unlocked.map(a => a.key));
    const catalog = CATALOG.map(item => ({
      key: item.key,
      title: item.title,
      description: item.description,
      icon: item.icon,
      unlocked: unlockedKeys.has(item.key),
      unlockedAt: unlocked.find(a => a.key === item.key)?.unlockedAt || null
    }));
    res.json({ success: true, data: { unlocked, catalog } });
  } catch (e) { next(e); }
});

router.post('/sync', async (req, res, next) => {
  try {
    const newly = await syncAchievements(req.user._id);
    res.json({ success: true, data: newly });
  } catch (e) { next(e); }
});

module.exports = router;
