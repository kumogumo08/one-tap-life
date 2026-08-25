import { deriveProgressFromHistory, mergeUserProgress } from '@/src/lib/progressCore';
import { readJson, writeJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import { normalizeUserProgress, type UserProgress } from '@/src/types/progress';
import { normalizeHistoryList } from '@/src/types/storage';

export {
  getAvailableTaskLevels,
  getLevelUnlockProgress,
  getUnlockedTaskLevel,
  isLevelUnlocked,
  LEVEL2_REQUIRED_COMPLETIONS,
  LEVEL2_REQUIRED_DAYS,
  LEVEL3_REQUIRED_COMPLETIONS,
  LEVEL3_REQUIRED_DAYS,
} from '@/src/lib/progressCore';
export type { LevelUnlockProgress } from '@/src/lib/progressCore';

/** 保存済み進捗と履歴をマージして永続化する（既存ユーザーの初回バックフィル含む） */
export async function ensureUserProgress(): Promise<UserProgress> {
  const saved = normalizeUserProgress(
    await readJson<unknown>(STORAGE_KEYS.progress, null)
  );
  const history = normalizeHistoryList(
    await readJson<unknown>(STORAGE_KEYS.history, [])
  );
  const merged = mergeUserProgress(saved, deriveProgressFromHistory(history));

  if (
    merged.firstCompletedAt !== saved.firstCompletedAt ||
    merged.completedCount !== saved.completedCount
  ) {
    await writeJson(STORAGE_KEYS.progress, merged);
  }

  return merged;
}

/** 履歴保存成功後に呼ぶ。表示しただけでは呼ばない */
export async function recordTaskCompletion(completedTs: number): Promise<boolean> {
  const saved = normalizeUserProgress(
    await readJson<unknown>(STORAGE_KEYS.progress, null)
  );
  const history = normalizeHistoryList(
    await readJson<unknown>(STORAGE_KEYS.history, [])
  );
  const derived = deriveProgressFromHistory(history);
  const mergedFirst = mergeUserProgress(saved, derived).firstCompletedAt;

  const next: UserProgress = {
    firstCompletedAt:
      mergedFirst ??
      (Number.isFinite(completedTs) && completedTs > 0 ? Math.floor(completedTs) : null),
    // 保存済み+1 を基本とし、履歴件数より減らさない（ensure 未実行時の取りこぼし防止）
    completedCount: Math.max(saved.completedCount + 1, derived.completedCount),
  };

  return writeJson(STORAGE_KEYS.progress, next);
}
