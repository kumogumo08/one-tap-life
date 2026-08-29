export const RECENT_TASK_IDS_MAX = 3;

/**
 * 直近タスクID。古い → 新しい。最大3件。重複なし。
 * 不正値（null / 非配列 / 非文字列 / 4件以上 / 重複）は安全に捨てて整形する。
 */
export function normalizeRecentTaskIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) continue;
    const existing = out.indexOf(item);
    if (existing >= 0) out.splice(existing, 1);
    out.push(item);
  }
  return out.slice(-RECENT_TASK_IDS_MAX);
}

/** 新しいIDを末尾に追加。既出なら末尾へ移し、最古から落とす */
export function appendRecentTaskId(
  recent: readonly string[],
  id: string
): string[] {
  const base = normalizeRecentTaskIds(recent);
  if (typeof id !== 'string' || id.length === 0) return base;
  return normalizeRecentTaskIds([...base, id]);
}
