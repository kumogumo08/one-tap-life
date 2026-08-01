import { TASKS } from '@/src/data/tasks';
import type { Task, TaskLevel } from '@/src/types/task';

export type PickedTask = {
  id: string;
  label: string;
};

/**
 * Home で使っていた抽選ロジックをそのまま移したもの。
 * 重み: move/stretch 70% / mind 20% / rest 10%。直前 ID 除外。
 */
export function pickTask(level: TaskLevel, lastId: string | null): PickedTask {
  const all = TASKS.filter((t) => t.level === level);
  const moveStretch = all.filter((t) => t.kind === 'move' || t.kind === 'stretch');
  const mind = all.filter((t) => t.kind === 'mind');
  const rest = all.filter((t) => t.kind === 'rest');

  if (!Array.isArray(all) || all.length === 0) {
    return { id: 'fallback', label: '水をコップ1杯飲む' };
  }

  const filterNotLast = (arr: Task[]) => (lastId ? arr.filter((t) => t.id !== lastId) : arr);

  const r = Math.random();
  let bucket: Task[] = [];

  if (r < 0.7) bucket = moveStretch;
  else if (r < 0.9) bucket = mind;
  else bucket = rest;

  let candidates = filterNotLast(bucket);
  if (candidates.length === 0) candidates = filterNotLast(all);
  if (candidates.length === 0) candidates = all;

  const t = candidates[Math.floor(Math.random() * candidates.length)];
  return { id: t.id, label: t.label };
}
