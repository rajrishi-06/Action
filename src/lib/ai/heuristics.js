import { DEFAULT_PRIORITY } from '../taskModel';
import { toDate } from '../date';

/**
 * Local, offline task intelligence.
 *
 * These rules are the app's baseline behaviour — they run instantly, cost
 * nothing, and work with no API account. When a model is configured its answer
 * is preferred, but everything here still runs as the fallback.
 */

const TEMPLATES = [
  {
    id: 'exam',
    match: /\b(exam|test|quiz|midterm|final|certification)\b/i,
    subtasks: [
      'Gather all lecture notes and materials',
      'Build a one-page summary per topic',
      'Work through past papers',
      'Re-drill the weakest topics',
      'Do a timed mock run',
    ],
  },
  {
    id: 'website',
    match: /\b(portfolio|website|landing page|web ?app)\b/i,
    subtasks: [
      'Sketch the page structure',
      'Set up the project and tooling',
      'Build the core pages',
      'Make it responsive and accessible',
      'Deploy and check it live',
    ],
  },
  {
    id: 'writing',
    match: /\b(essay|report|article|blog|paper|proposal|thesis)\b/i,
    subtasks: [
      'Clarify the argument in one sentence',
      'Collect sources and evidence',
      'Draft an outline',
      'Write the first draft',
      'Edit for clarity and cut 10%',
    ],
  },
  {
    id: 'coding',
    match: /\b(code|program|implement|refactor|debug|api|feature|migration)\b/i,
    subtasks: [
      'Write down the acceptance criteria',
      'Sketch the approach and edge cases',
      'Implement the happy path',
      'Handle errors and edge cases',
      'Add tests and update the docs',
    ],
  },
  {
    id: 'meeting',
    match: /\b(meeting|standup|1:1|one-on-one|review|presentation|demo|interview)\b/i,
    subtasks: [
      'Set the goal and agenda',
      'Prepare notes and materials',
      'Send the invite and context',
      'Capture decisions and owners',
      'Follow up on the actions',
    ],
  },
  {
    id: 'travel',
    match: /\b(trip|travel|vacation|holiday|flight|book(ing)?)\b/i,
    subtasks: [
      'Fix the dates and budget',
      'Book transport',
      'Book accommodation',
      'Plan the day-to-day',
      'Sort documents and packing',
    ],
  },
  {
    id: 'move',
    match: /\b(move|moving|relocat|apartment|house hunt)\b/i,
    subtasks: [
      'Set the moving date',
      'Get quotes from movers',
      'Sort, pack and label',
      'Redirect post and utilities',
      'Confirm keys and handover',
    ],
  },
  {
    id: 'generic-project',
    match: /\b(project|plan|prepare|build|create|develop|design|launch|organi[sz]e|research|study|learn)\b/i,
    subtasks: [
      'Define what "done" looks like',
      'List the pieces of work',
      'Do the first concrete step',
      'Review progress and adjust',
      'Wrap up and share the result',
    ],
  },
];

const TAG_RULES = [
  { tag: 'work', re: /\b(work|client|meeting|report|deadline|project|standup|invoice|email|deck|sprint)\b/i },
  { tag: 'health', re: /\b(gym|workout|run|doctor|dentist|medicine|therapy|sleep|yoga|exercise)\b/i },
  { tag: 'finance', re: /\b(pay|bill|tax|invoice|budget|bank|rent|insurance|salary|refund)\b/i },
  { tag: 'shopping', re: /\b(buy|order|shop|groceries|purchase|amazon|pick up)\b/i },
  { tag: 'learning', re: /\b(learn|study|course|read|tutorial|practice|exam|revise|lecture)\b/i },
  { tag: 'home', re: /\b(clean|laundry|dishes|repair|fix|garden|cook|tidy|bins)\b/i },
  { tag: 'social', re: /\b(call|meet|birthday|dinner|party|visit|catch up|message)\b/i },
  { tag: 'admin', re: /\b(renew|register|form|apply|book|appointment|passport|licen[cs]e)\b/i },
];

/** Rough duration signals, in minutes. */
const DURATION_RULES = [
  { minutes: 5, re: /\b(email|reply|text|message|call back|quick|remind|ping)\b/i },
  { minutes: 15, re: /\b(call|review|check|book|order|pay|schedule|tidy)\b/i },
  { minutes: 30, re: /\b(meeting|standup|clean|shop|groceries|walk|errand)\b/i },
  { minutes: 60, re: /\b(workout|gym|write|draft|study|read|cook|practice)\b/i },
  { minutes: 120, re: /\b(build|implement|design|research|prepare|refactor|debug)\b/i },
  { minutes: 240, re: /\b(project|launch|move|migrate|overhaul|rewrite)\b/i },
];

export function localSubtasks(title) {
  if (!title || title.trim().length < 4) return null;
  const template = TEMPLATES.find((entry) => entry.match.test(title));
  return template ? [...template.subtasks] : null;
}

export function localTags(title) {
  if (!title) return [];
  return TAG_RULES.filter((rule) => rule.re.test(title))
    .map((rule) => rule.tag)
    .slice(0, 3);
}

export function localEstimate(title) {
  if (!title) return null;
  // Longest-matching rule wins, so "build a project" reads as the bigger job.
  const matches = DURATION_RULES.filter((rule) => rule.re.test(title));
  if (matches.length === 0) return null;
  return Math.max(...matches.map((rule) => rule.minutes));
}

/** Priority suggested purely from how close the due date is. */
export function localPriority(task) {
  const due = toDate(task?.dueDate);
  if (!due) return DEFAULT_PRIORITY;
  const hours = (due.getTime() - Date.now()) / 3_600_000;
  if (hours < 0) return 'urgent';
  if (hours < 24) return 'urgent';
  if (hours < 72) return 'high';
  if (hours < 24 * 7) return 'medium';
  return 'low';
}

/**
 * Workload warnings shown by the coach. Each has a stable `id` so dismissals
 * survive re-renders (the old version keyed off the message string).
 */
export function localInsights(tasks, now = new Date()) {
  const insights = [];
  const open = tasks.filter((task) => !task.completed);

  const overdue = open.filter((task) => {
    const due = toDate(task.dueDate);
    return due && due.getTime() < now.getTime();
  });

  if (overdue.length > 0) {
    insights.push({
      id: 'overdue',
      severity: 'high',
      title: `${overdue.length} task${overdue.length > 1 ? 's are' : ' is'} overdue`,
      body: 'Reschedule what no longer matters — a due date you ignore stops meaning anything.',
      tasks: overdue.slice(0, 4),
      action: 'reschedule-overdue',
    });
  }

  const dueToday = open.filter((task) => {
    const due = toDate(task.dueDate);
    return due && due.toDateString() === now.toDateString();
  });

  if (dueToday.length > 6) {
    insights.push({
      id: 'today-overloaded',
      severity: 'medium',
      title: `${dueToday.length} tasks are due today`,
      body: 'That is more than most days fit. Pick the three that matter and move the rest.',
    });
  }

  if (open.length > 25) {
    insights.push({
      id: 'backlog-large',
      severity: 'medium',
      title: `${open.length} open tasks`,
      body: 'A backlog this size stops being a plan. Archive or delete what you will not actually do.',
    });
  }

  const undated = open.filter((task) => !task.dueDate);
  if (undated.length >= 5 && undated.length > open.length * 0.6) {
    insights.push({
      id: 'undated',
      severity: 'low',
      title: `${undated.length} tasks have no date`,
      body: 'Tasks without a date rarely get done. Give the important ones a day.',
    });
  }

  const breakdownCandidate = open.find(
    (task) => (!task.subtasks || task.subtasks.length === 0) && localSubtasks(task.title),
  );
  if (breakdownCandidate) {
    insights.push({
      id: `breakdown:${breakdownCandidate.id}`,
      severity: 'low',
      title: `"${breakdownCandidate.title}" looks like a multi-step job`,
      body: 'Breaking it into steps makes it much likelier to actually start.',
      task: breakdownCandidate,
      action: 'breakdown',
    });
  }

  return insights;
}

/** One short coaching line, chosen from real numbers rather than generated. */
export function localCoaching(stats) {
  if (stats.total === 0) return 'Add your first task — capture beats memory every time.';
  if (stats.overdue > 3) return `${stats.overdue} tasks have slipped. Clear or reschedule them before adding more.`;
  if (stats.completedToday >= 5) return `${stats.completedToday} done today. That is a genuinely strong day.`;
  if (stats.streak >= 7) return `${stats.streak}-day streak. Consistency is doing more for you than intensity.`;
  if (stats.completedToday > 0) return `${stats.completedToday} done today — keep the momentum on one more.`;
  if (stats.dueToday > 0) return `${stats.dueToday} due today. Start with the smallest one to get moving.`;
  return 'Nothing is due today. Good moment to pull something forward from the backlog.';
}
