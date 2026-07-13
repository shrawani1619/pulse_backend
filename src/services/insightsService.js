const Action = require('../models/Action');
const Dream = require('../models/Dream');
const Goal = require('../models/Goal');
const Milestone = require('../models/Milestone');
const FocusSession = require('../models/FocusSession');
const DreamTime = require('../models/DreamTime');

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

async function loadContext(userId) {
  const todayStart = startOfDay();
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(todayStart);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [
    dreams,
    goals,
    milestones,
    actions,
    todayActions,
    overdueActions,
    focusWeek,
    dreamTimeToday,
    dreamTimeMissed
  ] = await Promise.all([
    Dream.find({ user: userId }),
    Goal.find({ user: userId }),
    Milestone.find({ user: userId }),
    Action.find({ user: userId }),
    Action.find({
      user: userId,
      scheduledDate: { $gte: todayStart, $lt: todayEnd }
    }),
    Action.find({
      user: userId,
      status: { $in: ['pending', 'in_progress'] },
      scheduledDate: { $lt: todayStart }
    }).populate('milestone', 'title').limit(10),
    FocusSession.find({
      user: userId,
      status: 'completed',
      endedAt: { $gte: weekAgo }
    }),
    DreamTime.find({
      user: userId,
      date: { $gte: todayStart, $lt: todayEnd }
    }).populate('dream', 'title color'),
    DreamTime.find({
      user: userId,
      status: 'planned',
      date: { $lt: todayStart }
    }).limit(5)
  ]);

  return {
    dreams,
    goals,
    milestones,
    actions,
    todayActions,
    overdueActions,
    focusWeek,
    dreamTimeToday,
    dreamTimeMissed,
    todayStart,
    weekAgo,
    monthAgo
  };
}

function buildNudges(ctx) {
  const nudges = [];

  if (ctx.overdueActions.length) {
    nudges.push({
      id: 'overdue-actions',
      type: 'accountability',
      severity: 'high',
      title: `${ctx.overdueActions.length} overdue action${ctx.overdueActions.length > 1 ? 's' : ''}`,
      message: `You still have unfinished work from previous days. Start with: "${ctx.overdueActions[0].title}".`,
      cta: { label: 'Open Actions', href: '/actions' }
    });
  }

  const pendingToday = ctx.todayActions.filter(a => a.status !== 'completed' && a.status !== 'skipped');
  if (pendingToday.length) {
    nudges.push({
      id: 'today-pending',
      type: 'daily',
      severity: 'medium',
      title: `${pendingToday.length} action${pendingToday.length > 1 ? 's' : ''} left today`,
      message: 'Protect the day — complete at least one before you check out.',
      cta: { label: 'Go to Today', href: '/today' }
    });
  } else if (ctx.todayActions.length === 0) {
    nudges.push({
      id: 'no-today-plan',
      type: 'planning',
      severity: 'medium',
      title: 'No plan for today',
      message: 'Empty days drift. Schedule 1–3 actions aligned to a milestone.',
      cta: { label: 'Add Action', href: '/actions' }
    });
  }

  const plannedBlocks = ctx.dreamTimeToday.filter(b => b.status === 'planned');
  if (plannedBlocks.length) {
    nudges.push({
      id: 'dream-time-soon',
      type: 'dream_time',
      severity: 'low',
      title: 'Dream Time is on the calendar',
      message: `${plannedBlocks[0].startTime}–${plannedBlocks[0].endTime}${plannedBlocks[0].dream?.title ? ` for ${plannedBlocks[0].dream.title}` : ''}. Treat it as protected.`,
      cta: { label: 'Dream Time', href: '/dream-time' }
    });
  }

  if (ctx.dreamTimeMissed.length) {
    nudges.push({
      id: 'missed-dream-time',
      type: 'accountability',
      severity: 'high',
      title: 'Missed Dream Time blocks',
      message: 'Past protected blocks were left as planned. Mark them done/missed, or reschedule.',
      cta: { label: 'Review Dream Time', href: '/dream-time' }
    });
  }

  if (!ctx.focusWeek.length) {
    nudges.push({
      id: 'no-focus-week',
      type: 'focus',
      severity: 'low',
      title: 'No focus sessions this week',
      message: 'A single 25-minute deep-work block rebuilds momentum faster than scrolling.',
      cta: { label: 'Start Focus', href: '/focus' }
    });
  }

  if (!ctx.dreams.length) {
    nudges.push({
      id: 'no-dreams',
      type: 'onboarding',
      severity: 'high',
      title: 'Start with a dream',
      message: 'Pulse works best when daily actions ladder up to a long-term vision.',
      cta: { label: 'Create Dream', href: '/dreams' }
    });
  }

  return nudges;
}

function buildInsights(ctx) {
  const insights = [];
  const completed = ctx.actions.filter(a => a.status === 'completed');
  const total = ctx.actions.length;
  const completionRate = total ? Math.round((completed.length / total) * 100) : 0;

  insights.push({
    id: 'completion-rate',
    category: 'performance',
    title: 'Action completion rate',
    summary: total
      ? `You've completed ${completionRate}% of all actions (${completed.length}/${total}).`
      : 'No actions yet — create your first daily task under a milestone.',
    recommendation: completionRate < 40 && total > 0
      ? 'Shrink action size. Prefer 15–30 minute tasks you can finish the same day.'
      : completionRate >= 70
        ? 'Strong follow-through. Raise ambition slightly on next week’s actions.'
        : 'Keep a short daily list (3 max) and finish before adding more.',
    metric: { value: completionRate, unit: '%', label: 'completion' }
  });

  const focusMinutes = Math.round(
    ctx.focusWeek.reduce((s, f) => s + (f.elapsedSeconds || 0), 0) / 60
  );
  insights.push({
    id: 'focus-week',
    category: 'focus',
    title: 'Deep work this week',
    summary: focusMinutes
      ? `${focusMinutes} focused minutes logged in the last 7 days.`
      : 'No completed focus sessions in the last 7 days.',
    recommendation: focusMinutes < 60
      ? 'Book one Dream Time block and run a 25-minute focus session inside it.'
      : 'Nice consistency. Try linking focus sessions to your highest-priority dream.',
    metric: { value: focusMinutes, unit: 'min', label: 'focus' }
  });

  const stalledDreams = ctx.dreams.filter(d => d.status === 'active' && (d.progress || 0) < 10);
  if (stalledDreams.length) {
    insights.push({
      id: 'stalled-dreams',
      category: 'alignment',
      title: 'Dreams needing motion',
      summary: `${stalledDreams.length} active dream${stalledDreams.length > 1 ? 's are' : ' is'} under 10% progress.`,
      recommendation: `Break "${stalledDreams[0].title}" into one goal and one milestone you can finish this week.`,
      metric: { value: stalledDreams.length, unit: '', label: 'stalled' }
    });
  }

  const goalsWithoutMilestones = ctx.goals.filter(
    g => !ctx.milestones.some(m => String(m.goal) === String(g._id))
  );
  if (goalsWithoutMilestones.length) {
    insights.push({
      id: 'goals-without-milestones',
      category: 'hierarchy',
      title: 'Goals without milestones',
      summary: `${goalsWithoutMilestones.length} goal${goalsWithoutMilestones.length > 1 ? 's lack' : ' lacks'} staged milestones.`,
      recommendation: `Add a first milestone under "${goalsWithoutMilestones[0].title}" so actions have a clear rung.`,
      metric: { value: goalsWithoutMilestones.length, unit: '', label: 'gaps' }
    });
  }

  const milestonesWithoutActions = ctx.milestones.filter(
    m => !ctx.actions.some(a => String(a.milestone) === String(m._id))
  );
  if (milestonesWithoutActions.length) {
    insights.push({
      id: 'milestones-without-actions',
      category: 'hierarchy',
      title: 'Milestones without actions',
      summary: `${milestonesWithoutActions.length} milestone${milestonesWithoutActions.length > 1 ? 's have' : ' has'} no daily actions yet.`,
      recommendation: `Create one executable action for "${milestonesWithoutActions[0].title}" scheduled today.`,
      metric: { value: milestonesWithoutActions.length, unit: '', label: 'idle' }
    });
  }

  const highPriorityPending = ctx.actions.filter(
    a => a.priority === 'high' && (a.status === 'pending' || a.status === 'in_progress')
  );
  if (highPriorityPending.length) {
    insights.push({
      id: 'high-priority-backlog',
      category: 'accountability',
      title: 'High-priority backlog',
      summary: `${highPriorityPending.length} high-priority action${highPriorityPending.length > 1 ? 's are' : ' is'} still open.`,
      recommendation: `Do "${highPriorityPending[0].title}" first today — priority only matters if it moves.`,
      metric: { value: highPriorityPending.length, unit: '', label: 'high' }
    });
  }

  if (!insights.length) {
    insights.push({
      id: 'getting-started',
      category: 'onboarding',
      title: 'Build your ladder',
      summary: 'Insights appear as you add dreams, goals, milestones, and actions.',
      recommendation: 'Create one dream, one goal, one milestone, and one action for today.',
      metric: { value: 0, unit: '', label: 'start' }
    });
  }

  return insights;
}

async function getInsightsBundle(userId) {
  const ctx = await loadContext(userId);
  return {
    generatedAt: new Date(),
    nudges: buildNudges(ctx),
    insights: buildInsights(ctx),
    engine: 'rule-based-v1'
  };
}

async function getAnalytics(userId) {
  const todayStart = startOfDay();
  const monthAgo = new Date(todayStart);
  monthAgo.setDate(monthAgo.getDate() - 29);

  const [actions, focusSessions, dreamTimes, dreams, goals, milestones] = await Promise.all([
    Action.find({ user: userId }),
    FocusSession.find({ user: userId, status: 'completed', endedAt: { $gte: monthAgo } }),
    DreamTime.find({ user: userId, date: { $gte: monthAgo } }),
    Dream.find({ user: userId }),
    Goal.find({ user: userId }),
    Milestone.find({ user: userId })
  ]);

  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    last30Days.push(dayKey(d));
  }

  const activityByDay = last30Days.map(key => {
    const actionsDone = actions.filter(a => {
      const d = a.completedAt || (a.status === 'completed' ? a.updatedAt : null);
      return d && dayKey(d) === key;
    }).length;
    const focusMin = Math.round(
      focusSessions
        .filter(s => s.endedAt && dayKey(s.endedAt) === key)
        .reduce((sum, s) => sum + (s.elapsedSeconds || 0), 0) / 60
    );
    const dreamTimeDone = dreamTimes.filter(
      t => t.date && dayKey(t.date) === key && t.status === 'completed'
    ).length;
    return {
      date: key,
      actionsCompleted: actionsDone,
      focusMinutes: focusMin,
      dreamTimeCompleted: dreamTimeDone,
      active: actionsDone + focusMin + dreamTimeDone > 0
    };
  });

  const byStatus = {
    pending: actions.filter(a => a.status === 'pending').length,
    in_progress: actions.filter(a => a.status === 'in_progress').length,
    completed: actions.filter(a => a.status === 'completed').length,
    skipped: actions.filter(a => a.status === 'skipped').length
  };

  const byPriority = {
    low: actions.filter(a => a.priority === 'low').length,
    medium: actions.filter(a => a.priority === 'medium').length,
    high: actions.filter(a => a.priority === 'high').length
  };

  const dreamProgress = dreams.map(d => ({
    id: d._id,
    title: d.title,
    color: d.color,
    progress: d.progress || 0,
    status: d.status
  }));

  const activeDays = activityByDay.filter(d => d.active).length;
  const totalFocus = activityByDay.reduce((s, d) => s + d.focusMinutes, 0);
  const totalActionsDone = activityByDay.reduce((s, d) => s + d.actionsCompleted, 0);

  return {
    periodDays: 30,
    totals: {
      dreams: dreams.length,
      goals: goals.length,
      milestones: milestones.length,
      actions: actions.length,
      activeDays,
      focusMinutes: totalFocus,
      actionsCompleted: totalActionsDone
    },
    actionsByStatus: byStatus,
    actionsByPriority: byPriority,
    dreamProgress,
    activityByDay
  };
}

module.exports = { getInsightsBundle, getAnalytics };
