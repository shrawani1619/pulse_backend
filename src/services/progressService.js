const Action = require('../models/Action');
const Milestone = require('../models/Milestone');
const Goal = require('../models/Goal');
const Dream = require('../models/Dream');

async function recalcMilestoneProgress(milestoneId, userId) {
  if (!milestoneId) return;
  const actions = await Action.find({ milestone: milestoneId, user: userId });
  if (!actions.length) {
    await Milestone.findOneAndUpdate({ _id: milestoneId, user: userId }, { progress: 0 });
    return;
  }
  const done = actions.filter(a => a.status === 'completed').length;
  const progress = Math.round((done / actions.length) * 100);
  const status = progress === 100 ? 'completed' : undefined;
  await Milestone.findOneAndUpdate(
    { _id: milestoneId, user: userId },
    status ? { progress, status } : { progress }
  );
}

async function recalcGoalProgress(goalId, userId) {
  if (!goalId) return;
  const milestones = await Milestone.find({ goal: goalId, user: userId });
  if (!milestones.length) {
    await Goal.findOneAndUpdate({ _id: goalId, user: userId }, { progress: 0 });
    return;
  }
  const progress = Math.round(
    milestones.reduce((sum, m) => sum + (m.progress || 0), 0) / milestones.length
  );
  const status = progress === 100 ? 'completed' : undefined;
  await Goal.findOneAndUpdate(
    { _id: goalId, user: userId },
    status ? { progress, status } : { progress }
  );
}

async function recalcDreamProgress(dreamId, userId) {
  if (!dreamId) return;
  const goals = await Goal.find({ dream: dreamId, user: userId });
  if (!goals.length) {
    await Dream.findOneAndUpdate({ _id: dreamId, user: userId }, { progress: 0 });
    return;
  }
  const progress = Math.round(
    goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length
  );
  const status = progress === 100 ? 'completed' : undefined;
  await Dream.findOneAndUpdate(
    { _id: dreamId, user: userId },
    status ? { progress, status } : { progress }
  );
}

async function rollupFromAction(action) {
  if (!action) return;
  const userId = action.user;
  const milestoneId = action.milestone;
  const goalId = action.goal;

  await recalcMilestoneProgress(milestoneId, userId);

  let dreamId = null;
  if (goalId) {
    await recalcGoalProgress(goalId, userId);
    const goal = await Goal.findById(goalId).select('dream');
    dreamId = goal?.dream;
  } else if (milestoneId) {
    const milestone = await Milestone.findById(milestoneId).select('goal');
    if (milestone?.goal) {
      await recalcGoalProgress(milestone.goal, userId);
      const goal = await Goal.findById(milestone.goal).select('dream');
      dreamId = goal?.dream;
    }
  }

  if (dreamId) await recalcDreamProgress(dreamId, userId);
}

async function rollupFromMilestone(milestone) {
  if (!milestone) return;
  await recalcGoalProgress(milestone.goal, milestone.user);
  const goal = await Goal.findById(milestone.goal).select('dream');
  if (goal?.dream) await recalcDreamProgress(goal.dream, milestone.user);
}

async function rollupFromGoal(goal) {
  if (!goal) return;
  await recalcDreamProgress(goal.dream, goal.user);
}

module.exports = {
  rollupFromAction,
  rollupFromMilestone,
  rollupFromGoal,
  recalcMilestoneProgress,
  recalcGoalProgress,
  recalcDreamProgress
};
