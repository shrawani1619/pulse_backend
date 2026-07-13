const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const FocusSession = require('../models/FocusSession');
const Dream = require('../models/Dream');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const sessions = await FocusSession.find(filter)
      .populate('dream', 'title color')
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, data: sessions });
  } catch (e) { next(e); }
});

router.get('/active', async (req, res, next) => {
  try {
    const session = await FocusSession.findOne({ user: req.user._id, status: 'active' })
      .populate('dream', 'title color');
    res.json({ success: true, data: session });
  } catch (e) { next(e); }
});

router.post('/start', async (req, res, next) => {
  try {
    const existing = await FocusSession.findOne({ user: req.user._id, status: 'active' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A focus session is already active', data: existing });
    }

    if (req.body.dream) {
      const dream = await Dream.findOne({ _id: req.body.dream, user: req.user._id });
      if (!dream) return res.status(404).json({ success: false, message: 'Dream not found' });
    }

    const session = await FocusSession.create({
      user: req.user._id,
      dream: req.body.dream || undefined,
      dreamTime: req.body.dreamTime || undefined,
      plannedMinutes: req.body.plannedMinutes || 25,
      startedAt: new Date(),
      status: 'active'
    });
    await session.populate('dream', 'title color');
    res.status(201).json({ success: true, data: session });
  } catch (e) { next(e); }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    const session = await FocusSession.findOne({ _id: req.params.id, user: req.user._id, status: 'active' });
    if (!session) return res.status(404).json({ success: false, message: 'Active session not found' });

    session.status = 'completed';
    session.endedAt = new Date();
    session.elapsedSeconds = req.body.elapsedSeconds ?? Math.floor((session.endedAt - session.startedAt) / 1000);
    if (req.body.notes) session.notes = req.body.notes;
    await session.save();
    await session.populate('dream', 'title color');
    res.json({ success: true, data: session });
  } catch (e) { next(e); }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const session = await FocusSession.findOne({ _id: req.params.id, user: req.user._id, status: 'active' });
    if (!session) return res.status(404).json({ success: false, message: 'Active session not found' });

    session.status = 'cancelled';
    session.endedAt = new Date();
    session.elapsedSeconds = req.body.elapsedSeconds ?? Math.floor((session.endedAt - session.startedAt) / 1000);
    await session.save();
    await session.populate('dream', 'title color');
    res.json({ success: true, data: session });
  } catch (e) { next(e); }
});

module.exports = router;
