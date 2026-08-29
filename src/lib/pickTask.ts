import { TASKS } from '@/src/data/tasks';
import type { Task, TaskLevel } from '@/src/types/task';

export type PickedTask = {
  id: string;
  label: string;
};

function idSet(lastId: string | null, extra: readonly string[] = []): Set<string> {
  const ids = new Set<string>();
  if (lastId) ids.add(lastId);
  for (const id of extra) {
    if (typeof id === 'string' && id.length > 0) ids.add(id);
  }
  return ids;
}

function except(arr: Task[], ids: Set<string>): Task[] {
  if (ids.size === 0) return arr;
  return arr.filter((t) => !ids.has(t.id));
}

/**
 * バケット内から候補を決める。存在しないIDは単に一致しないだけ。
 * 1. recent + lastId 除外
 * 2. lastId のみ除外
 * 3. バケット全件
 * 4. 全TASKS から lastId 除外 → 全件
 */
export function resolvePickTaskCandidates(
  bucket: Task[],
  all: Task[],
  lastId: string | null,
  excludedTaskIds: readonly string[] = []
): Task[] {
  const recentAndLast = idSet(lastId, excludedTaskIds);
  const lastOnly = idSet(lastId);

  let candidates = except(bucket, recentAndLast);
  if (candidates.length === 0) candidates = except(bucket, lastOnly);
  if (candidates.length === 0) candidates = bucket;
  if (candidates.length === 0) candidates = except(all, lastOnly);
  if (candidates.length === 0) candidates = all;
  return candidates;
}

/**
 * Home で使っていた抽選ロジックをそのまま移したもの。
 * 重み: move/stretch 70% / mind 20% / rest 10%。
 * lastId と excludedTaskIds（直近履歴）を選んだバケット内から除外する。
 */
export function pickTask(
  level: TaskLevel,
  lastId: string | null,
  excludedTaskIds: readonly string[] = []
): PickedTask {
  const all = TASKS.filter((t) => t.level === level);
  const moveStretch = all.filter((t) => t.kind === 'move' || t.kind === 'stretch');
  const mind = all.filter((t) => t.kind === 'mind');
  const rest = all.filter((t) => t.kind === 'rest');

  if (!Array.isArray(all) || all.length === 0) {
    return { id: 'fallback', label: '水をコップ1杯飲む' };
  }

  const r = Math.random();
  let bucket: Task[] = [];

  if (r < 0.7) bucket = moveStretch;
  else if (r < 0.9) bucket = mind;
  else bucket = rest;

  const candidates = resolvePickTaskCandidates(bucket, all, lastId, excludedTaskIds);
  if (candidates.length === 0) {
    return { id: 'fallback', label: '水をコップ1杯飲む' };
  }
  const t = candidates[Math.floor(Math.random() * candidates.length)];
  return { id: t.id, label: t.label };
}
