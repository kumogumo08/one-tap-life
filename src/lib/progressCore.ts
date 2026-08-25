import { elapsedLocalCalendarDays } from '@/src/lib/dateKey';
import { DEFAULT_USER_PROGRESS, type UserProgress } from '@/src/types/progress';
import type { HistoryItem } from '@/src/types/storage';
import type { TaskLevel } from '@/src/types/task';

export const LEVEL2_REQUIRED_DAYS = 7;
export const LEVEL2_REQUIRED_COMPLETIONS = 7;
export const LEVEL3_REQUIRED_DAYS = 21;
export const LEVEL3_REQUIRED_COMPLETIONS = 30;

function isValidTs(ts: number | null | undefined): ts is number {
  return typeof ts === 'number' && Number.isFinite(ts) && ts > 0;
}

/** 履歴から取れる範囲での最低保証値。500件上限があるため生涯値ではない */
export function deriveProgressFromHistory(items: HistoryItem[]): UserProgress {
  if (!Array.isArray(items) || items.length === 0) {
    return { ...DEFAULT_USER_PROGRESS };
  }

  const timestamps = items.map((item) => item.ts).filter(isValidTs);

  return {
    firstCompletedAt: timestamps.length > 0 ? Math.min(...timestamps) : null,
    completedCount: items.length,
  };
}

/**
 * 保存済み進捗を履歴由来より減らさない。
 * firstCompletedAt は有効な値のうちより古い方を残す。
 */
export function mergeUserProgress(saved: UserProgress, derived: UserProgress): UserProgress {
  const firstCandidates = [saved.firstCompletedAt, derived.firstCompletedAt].filter(isValidTs);

  return {
    firstCompletedAt: firstCandidates.length > 0 ? Math.min(...firstCandidates) : null,
    completedCount: Math.max(saved.completedCount, derived.completedCount),
  };
}

export function isLevelUnlocked(
  level: TaskLevel,
  progress: UserProgress,
  now: number = Date.now()
): boolean {
  if (level === 1) return true;

  const { firstCompletedAt, completedCount } = progress;
  if (!isValidTs(firstCompletedAt)) return false;

  const days = elapsedLocalCalendarDays(firstCompletedAt, now);

  if (level === 2) {
    return days >= LEVEL2_REQUIRED_DAYS && completedCount >= LEVEL2_REQUIRED_COMPLETIONS;
  }

  if (level === 3) {
    return days >= LEVEL3_REQUIRED_DAYS && completedCount >= LEVEL3_REQUIRED_COMPLETIONS;
  }

  return false;
}

export function getUnlockedTaskLevel(
  progress: UserProgress,
  now: number = Date.now()
): TaskLevel {
  if (isLevelUnlocked(3, progress, now)) return 3;
  if (isLevelUnlocked(2, progress, now)) return 2;
  return 1;
}

/** Progress に応じて選択・抽選に使えるレベル。Level 1 は常に含む */
export function getAvailableTaskLevels(
  progress: UserProgress,
  now: number = Date.now()
): TaskLevel[] {
  const max = getUnlockedTaskLevel(progress, now);
  if (max === 3) return [1, 2, 3];
  if (max === 2) return [1, 2];
  return [1];
}

export type LevelUnlockProgress = {
  requiredDays: number;
  elapsedDays: number;
  remainingDays: number;
  requiredCompletions: number;
  completedCount: number;
  remainingCompletions: number;
  unlocked: boolean;
};

export function getLevelUnlockProgress(
  level: TaskLevel,
  progress: UserProgress,
  now: number = Date.now()
): LevelUnlockProgress {
  const requiredDays = level === 3 ? LEVEL3_REQUIRED_DAYS : level === 2 ? LEVEL2_REQUIRED_DAYS : 0;
  const requiredCompletions =
    level === 3
      ? LEVEL3_REQUIRED_COMPLETIONS
      : level === 2
        ? LEVEL2_REQUIRED_COMPLETIONS
        : 0;

  const elapsedDays = isValidTs(progress.firstCompletedAt)
    ? Math.max(0, elapsedLocalCalendarDays(progress.firstCompletedAt, now))
    : 0;
  const completedCount = Math.max(0, progress.completedCount);

  return {
    requiredDays,
    elapsedDays,
    remainingDays: Math.max(0, requiredDays - elapsedDays),
    requiredCompletions,
    completedCount,
    remainingCompletions: Math.max(0, requiredCompletions - completedCount),
    unlocked: isLevelUnlocked(level, progress, now),
  };
}
