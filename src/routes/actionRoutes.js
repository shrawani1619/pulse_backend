const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { actionCreateRules, actionUpdateRules } = require('../middleware/validators');
const Action = require('../models/Action');
const Milestone = require('../models/Milestone');
const { rollupFromAction } = require('../services/progressService');

router.use(protect);

const populateAction = {
  path: 'milestone',
  select: 'title goal',
  populate: {
    path: 'goal',
    select: 'title dream',
    populate: { path: 'dream', select: 'title color' }
  }
};

router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.milestone) filter.milestone = req.query.milestone;
    if (req.query.goal) filter.goal = req.query.goal;
    if (req.query.status) filter.status = req.query.status;

    if (req.query.today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.scheduledDate = { $gte: start, $lt: end };
    } else if (req.query.date) {
      const day = new Date(req.query.date);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      filter.scheduledDate = { $gte: day, $lt: next };
    }

    const actions = await Action.find(filter)
      .populate(populateAction)
      .sort('scheduledDate -priority createdAt');
    res.json({ success: true, data: actions });
  } catch (e) { next(e); }
});

router.post('/', actionCreateRules, validate, async (req, res, next) => {
  try {
    const milestone = await Milestone.findOne({ _id: req.body.milestone, user: req.user._id });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

    const action = await Action.create({
      ...req.body,
      goal: milestone.goal,
      user: req.user._id
    });
    await rollupFromAction(action);
    await action.populate(populateAction);
    res.status(201).json({ success: true, data: action });
  } catch (e) { next(e); }
});

router.put('/:id', actionUpdateRules, validate, async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.status === 'completed' && !updates.completedAt) {
      updates.completedAt = new Date();
    }
    if (updates.status && updates.status !== 'completed') {
      updates.completedAt = null;
    }

    const action = await Action.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate(populateAction);

    if (!action) return res.status(404).json({ success: false, message: 'Action not found' });
    await rollupFromAction(action);
    res.json({ success: true, data: action });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const action = await Action.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!action) return res.status(404).json({ success: false, message: 'Action not found' });
    await rollupFromAction(action);
    res.json({ success: true, message: 'Action deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
