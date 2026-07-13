const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { dreamTimeCreateRules } = require('../middleware/validators');
const DreamTime = require('../models/DreamTime');
const Dream = require('../models/Dream');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.dream) filter.dream = req.query.dream;
    if (req.query.today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lt: end };
    } else if (req.query.date) {
      const day = new Date(req.query.date);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: day, $lt: next };
    }

    const blocks = await DreamTime.find(filter)
      .populate('dream', 'title color')
      .sort('date startTime');
    res.json({ success: true, data: blocks });
  } catch (e) { next(e); }
});

router.post('/', dreamTimeCreateRules, validate, async (req, res, next) => {
  try {
    const dream = await Dream.findOne({ _id: req.body.dream, user: req.user._id });
    if (!dream) return res.status(404).json({ success: false, message: 'Dream not found' });

    const block = await DreamTime.create({ ...req.body, user: req.user._id });
    await block.populate('dream', 'title color');
    res.status(201).json({ success: true, data: block });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const block = await DreamTime.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('dream', 'title color');
    if (!block) return res.status(404).json({ success: false, message: 'Dream Time not found' });
    res.json({ success: true, data: block });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const block = await DreamTime.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!block) return res.status(404).json({ success: false, message: 'Dream Time not found' });
    res.json({ success: true, message: 'Dream Time deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
