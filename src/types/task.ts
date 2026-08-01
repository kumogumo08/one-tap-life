export type TaskKind = 'move' | 'stretch' | 'mind' | 'rest';

export type TaskLevel = 1 | 2 | 3;

export type Task = {
  id: string;
  label: string;
  level: TaskLevel;
  kind: TaskKind;
  seconds?: number;
  description?: string;
};
