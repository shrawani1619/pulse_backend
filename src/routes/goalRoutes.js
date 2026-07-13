const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { goalCreateRules, goalUpdateRules } = require('../middleware/validators');
const Goal = require('../models/Goal');
const Dream = require('../models/Dream');
const { rollupFromGoal } = require('../services/progressService');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).populate('dream', 'title color').sort('-createdAt');
    res.json({ success: true, data: goals });
  } catch (e) { next(e); }
});

router.post('/', goalCreateRules, validate, async (req, res, next) => {
  try {
    const dream = await Dream.findOne({ _id: req.body.dream, user: req.user._id });
    if (!dream) return res.status(404).json({ success: false, message: 'Dream not found' });

    const goal = await Goal.create({ ...req.body, user: req.user._id });
    await rollupFromGoal(goal);
    await goal.populate('dream', 'title color');
    res.status(201).json({ success: true, data: goal });
  } catch (e) { next(e); }
});

router.put('/:id', goalUpdateRules, validate, async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('dream', 'title color');
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    await rollupFromGoal(goal);
    res.json({ success: true, data: goal });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    await rollupFromGoal(goal);
    res.json({ success: true, message: 'Goal deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
