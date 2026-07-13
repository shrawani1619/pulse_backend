const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { milestoneCreateRules, milestoneUpdateRules } = require('../middleware/validators');
const Milestone = require('../models/Milestone');
const Goal = require('../models/Goal');
const { rollupFromMilestone } = require('../services/progressService');

router.use(protect);

const populateMilestone = {
  path: 'goal',
  select: 'title dream',
  populate: { path: 'dream', select: 'title color' }
};

router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.goal) filter.goal = req.query.goal;

    const milestones = await Milestone.find(filter)
      .populate(populateMilestone)
      .sort('order createdAt');
    res.json({ success: true, data: milestones });
  } catch (e) { next(e); }
});

router.post('/', milestoneCreateRules, validate, async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.body.goal, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const milestone = await Milestone.create({ ...req.body, user: req.user._id });
    await rollupFromMilestone(milestone);
    await milestone.populate(populateMilestone);
    res.status(201).json({ success: true, data: milestone });
  } catch (e) { next(e); }
});

router.put('/:id', milestoneUpdateRules, validate, async (req, res, next) => {
  try {
    const milestone = await Milestone.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate(populateMilestone);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    await rollupFromMilestone(milestone);
    res.json({ success: true, data: milestone });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const milestone = await Milestone.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    await rollupFromMilestone(milestone);
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
