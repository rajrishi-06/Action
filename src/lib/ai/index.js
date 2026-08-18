import { complete, isRemoteAIEnabled, parseLines, AI_MODE, hasUnsafeKeyInProduction } from './provider';
import {
  localCoaching,
  localEstimate,
  localInsights,
  localPriority,
  localSubtasks,
  localTags,
} from './heuristics';
import { PRIORITIES } from '../taskModel';

export { AI_MODE, isRemoteAIEnabled, hasUnsafeKeyInProduction };
export { localInsights, localCoaching };

/**
 * Public AI surface.
 *
 * Every function returns a usable answer whether or not a model is configured:
 * the model is asked first when available, and the local heuristic is both the
 * fallback and the floor. Results carry `source` so the UI can be honest about
 * where a suggestion came from.
 */

/** Break a task into concrete steps. */
export async function suggestSubtasks(title, { signal } = {}) {
  const fallback = localSubtasks(title);

  if (isRemoteAIEnabled) {
    const text = await complete(
      [
        'Break this task into 3-5 concrete, sequential steps.',
        'Each step: start with a verb, at most 8 words, no numbering, one per line.',
        'Return only the steps.',
        '',
        `Task: "${title}"`,
      ].join('\n'),
      { signal, maxOutputTokens: 256 },
    );
    const lines = parseLines(text, 5);
    if (lines.length >= 2) return { items: lines, source: 'ai' };
  }

  return fallback ? { items: fallback, source: 'local' } : { items: [], source: 'local' };
}

/** Suggest tags for a task title. */
export async function suggestTags(title, { signal } = {}) {
  const fallback = localTags(title);

  if (isRemoteAIEnabled) {
    const text = await complete(
      [
        'Suggest 1-3 short lowercase tags for this task.',
        'Prefer: work, personal, health, finance, shopping, learning, social, home, admin.',
        'Return only the tags, comma separated, no hashes.',
        '',
        `Task: "${title}"`,
      ].join('\n'),
      { signal, maxOutputTokens: 32 },
    );

    if (text) {
      const tags = text
        .split(',')
        .map((tag) => tag.trim().toLowerCase().replace(/^#/, ''))
        .filter((tag) => /^[a-z0-9-]{2,20}$/.test(tag))
        .slice(0, 3);
      if (tags.length) return { items: tags, source: 'ai' };
    }
  }

  return { items: fallback, source: 'local' };
}

/** Estimate how long a task will take, in minutes. */
export async function suggestEstimate(title, { signal } = {}) {
  const fallback = localEstimate(title);

  if (isRemoteAIEnabled) {
    const text = await complete(
      `Estimate how many minutes this task takes. Reply with a number only.\n\nTask: "${title}"`,
      { signal, maxOutputTokens: 16 },
    );
    const minutes = Number.parseInt(String(text).replace(/\D/g, ''), 10);
    // Anything outside a working day is a hallucination, not an estimate.
    if (Number.isFinite(minutes) && minutes > 0 && minutes <= 480) {
      return { value: minutes, source: 'ai' };
    }
  }

  return { value: fallback, source: 'local' };
}

/** Suggest a priority. Deadline maths beats a model here, so it goes first. */
export async function suggestPriority(task, { signal } = {}) {
  const fallback = localPriority(task);
  if (task?.dueDate) return { value: fallback, source: 'local' };

  if (isRemoteAIEnabled) {
    const text = await complete(
      [
        'Classify this task as exactly one of: urgent, high, medium, low.',
        'Reply with the single word only.',
        '',
        `Task: "${task?.title ?? ''}"`,
      ].join('\n'),
      { signal, maxOutputTokens: 8 },
    );
    const value = String(text).toLowerCase().trim();
    if (PRIORITIES.includes(value)) return { value, source: 'ai' };
  }

  return { value: fallback, source: 'local' };
}

/** Suggest follow-up tasks based on recent activity. */
export async function suggestNextTasks(tasks, { signal } = {}) {
  const recent = tasks.slice(0, 12).map((task) => task.title);
  if (recent.length < 3) return { items: [], source: 'local', reason: 'not-enough-history' };

  if (isRemoteAIEnabled) {
    const text = await complete(
      [
        'Here are the tasks someone is working on:',
        recent.map((title) => `- ${title}`).join('\n'),
        '',
        'Suggest 3 useful follow-up tasks that are not already listed.',
        'Each on its own line, imperative, under 10 words, no numbering.',
      ].join('\n'),
      { signal, maxOutputTokens: 128 },
    );
    const existing = new Set(recent.map((title) => title.toLowerCase()));
    const items = parseLines(text, 3).filter((line) => !existing.has(line.toLowerCase()));
    if (items.length) return { items, source: 'ai' };
  }

  return { items: [], source: 'local', reason: 'no-model' };
}

/** A single coaching line for the dashboard. */
export async function suggestCoaching(stats, { signal } = {}) {
  const fallback = localCoaching(stats);

  if (isRemoteAIEnabled) {
    const text = await complete(
      [
        'You are a concise productivity coach. Give ONE actionable sentence, max 18 words.',
        'Be encouraging when the numbers are good and direct when they are not.',
        '',
        `Open: ${stats.open}. Overdue: ${stats.overdue}. Due today: ${stats.dueToday}.`,
        `Completed today: ${stats.completedToday}. Current streak: ${stats.streak} days.`,
      ].join('\n'),
      { signal, maxOutputTokens: 64 },
    );
    const line = String(text ?? '').split('\n')[0]?.trim();
    if (line && line.length > 10 && line.length < 160) return { value: line, source: 'ai' };
  }

  return { value: fallback, source: 'local' };
}
