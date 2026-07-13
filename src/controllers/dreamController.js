const Dream = require('../models/Dream');

exports.getDreams = async (req, res, next) => {
  try {
    const dreams = await Dream.find({ user: req.user._id }).sort('-createdAt');
    res.json({ success: true, count: dreams.length, data: dreams });
  } catch (error) { next(error); }
};

exports.createDream = async (req, res, next) => {
  try {
    const dream = await Dream.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, data: dream });
  } catch (error) { next(error); }
};

exports.updateDream = async (req, res, next) => {
  try {
    const dream = await Dream.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body, { new: true, runValidators: true }
    );
    if (!dream) return res.status(404).json({ success: false, message: 'Dream not found' });
    res.json({ success: true, data: dream });
  } catch (error) { next(error); }
};

exports.deleteDream = async (req, res, next) => {
  try {
    const dream = await Dream.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!dream) return res.status(404).json({ success: false, message: 'Dream not found' });
    res.json({ success: true, message: 'Dream deleted' });
  } catch (error) { next(error); }
};
