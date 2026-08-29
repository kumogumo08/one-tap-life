/** 当日の追加タスク。daily.task / lastTaskId とは別 */
export type ExtraSession = {
  dateKey: string;
  taskId: string;
  taskLabel: string;
  completed: boolean;
};

export function normalizeExtraSession(value: unknown): ExtraSession | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const dateKey = typeof raw.dateKey === 'string' && raw.dateKey.length > 0 ? raw.dateKey : '';
  const taskId = typeof raw.taskId === 'string' ? raw.taskId : '';
  const taskLabel = typeof raw.taskLabel === 'string' ? raw.taskLabel : '';
  const completed = raw.completed === true;
  if (!dateKey || !taskLabel) return null;
  return { dateKey, taskId, taskLabel, completed };
}

export function isUsableExtraSession(
  session: ExtraSession | null,
  todayKey: string
): session is ExtraSession {
  return session != null && session.dateKey === todayKey && session.taskLabel.length > 0;
}
