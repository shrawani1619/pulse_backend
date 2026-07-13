const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Action = require('../models/Action');
const FocusSession = require('../models/FocusSession');
const DreamTime = require('../models/DreamTime');
const Dream = require('../models/Dream');

router.use(protect);

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function calcStreak(daySet) {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // If nothing today, start from yesterday so streak can still count
  if (!daySet.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (daySet.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

router.get('/consistency', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [completedActions, focusSessions, dreamTimes, dreams] = await Promise.all([
      Action.find({
        user: userId,
        status: 'completed',
        $or: [
          { completedAt: { $gte: since } },
          { updatedAt: { $gte: since }, completedAt: { $exists: true } }
        ]
      }).select('completedAt updatedAt'),
      FocusSession.find({
        user: userId,
        status: 'completed',
        endedAt: { $gte: since }
      }).select('endedAt elapsedSeconds'),
      DreamTime.find({
        user: userId,
        status: 'completed',
        date: { $gte: since }
      }).select('date'),
      Dream.find({ user: userId })
    ]);

    const activeDays = new Set();
    completedActions.forEach(a => {
      const d = a.completedAt || a.updatedAt;
      if (d) activeDays.add(dayKey(d));
    });
    focusSessions.forEach(s => {
      if (s.endedAt) activeDays.add(dayKey(s.endedAt));
    });
    dreamTimes.forEach(t => {
      if (t.date) activeDays.add(dayKey(t.date));
    });

    const currentStreak = calcStreak(activeDays);
    const focusMinutes = Math.round(
      focusSessions.reduce((sum, s) => sum + (s.elapsedSeconds || 0), 0) / 60
    );

    const todayKey = dayKey(new Date());
    const actionsToday = completedActions.filter(a => {
      const d = a.completedAt || a.updatedAt;
      return d && dayKey(d) === todayKey;
    }).length;

    // Simple transparent discipline score (0–100) for last 30 days
    const streakPoints = Math.min(currentStreak * 8, 40);
    const actionPoints = Math.min(completedActions.length * 2, 30);
    const focusPoints = Math.min(Math.floor(focusMinutes / 3), 20);
    const dreamTimePoints = Math.min(dreamTimes.length * 5, 10);
    const disciplineScore = Math.min(100, streakPoints + actionPoints + focusPoints + dreamTimePoints);

    res.json({
      success: true,
      data: {
        currentStreak,
        activeDaysLast30: activeDays.size,
        actionsCompletedLast30: completedActions.length,
        actionsCompletedToday: actionsToday,
        focusMinutesLast30: focusMinutes,
        focusSessionsLast30: focusSessions.length,
        dreamTimeCompletedLast30: dreamTimes.length,
        totalDreams: dreams.length,
        activeDreams: dreams.filter(d => d.status === 'active').length,
        avgDreamProgress: dreams.length
          ? Math.round(dreams.reduce((s, d) => s + (d.progress || 0), 0) / dreams.length)
          : 0,
        disciplineScore,
        disciplineBreakdown: {
          streakPoints,
          actionPoints,
          focusPoints,
          dreamTimePoints,
          formula: 'streak(max 40) + actions(max 30) + focus(max 20) + dream time(max 10)'
        }
      }
    });
  } catch (e) { next(e); }
});

module.exports = router;
