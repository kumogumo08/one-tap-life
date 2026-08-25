/** Level解放用進捗。UserSettings とは別キーで保存する */
export type UserProgress = {
  firstCompletedAt: number | null;
  completedCount: number;
};

export const DEFAULT_USER_PROGRESS: UserProgress = {
  firstCompletedAt: null,
  completedCount: 0,
};

export function normalizeUserProgress(value: unknown): UserProgress {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_USER_PROGRESS };
  }

  const raw = value as Record<string, unknown>;
  const firstCompletedAt =
    typeof raw.firstCompletedAt === 'number' &&
    Number.isFinite(raw.firstCompletedAt) &&
    raw.firstCompletedAt > 0
      ? Math.floor(raw.firstCompletedAt)
      : null;
  const completedCount =
    typeof raw.completedCount === 'number' && Number.isFinite(raw.completedCount)
      ? Math.max(0, Math.floor(raw.completedCount))
      : 0;

  return {
    firstCompletedAt,
    completedCount,
  };
}
