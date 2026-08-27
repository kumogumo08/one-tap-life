/**
 * ホーム復帰時に、保存済み daily と「追加タスクが未完了か」から
 * どの復元経路へ進むかを決める。UI の setState は含めない。
 *
 * extra の未完了判定は extraInProgress のみ。
 * currentIsExtra は完了後も残ることがあるため、復元条件に使わない。
 */
export type HomeRestoreKind =
  | 'incomplete-main'
  | 'incomplete-extra'
  | 'completed-main'
  | 'empty';

export function decideHomeRestoreKind(input: {
  savedCompleted: boolean;
  savedHasTask: boolean;
  extraInProgress: boolean;
}): HomeRestoreKind {
  if (input.savedCompleted && input.savedHasTask) {
    return input.extraInProgress ? 'incomplete-extra' : 'completed-main';
  }

  if (!input.savedCompleted && input.savedHasTask) {
    return 'incomplete-main';
  }

  return 'empty';
}

/** 未完了メインはレベル変更しても再抽選せず、保存済み daily.task を維持する */
export function shouldKeepIncompleteMainTask(input: {
  savedCompleted: boolean;
  savedHasTask: boolean;
}): boolean {
  return input.savedCompleted !== true && input.savedHasTask;
}

export function extraCompletionKey(
  task: string,
  lastTaskId: string | null | undefined
): string {
  return `${lastTaskId ?? ''}:${task}`;
}

/** メインタスク完了を履歴に書いてよいか */
export function canRecordMainCompletion(dailyCompleted: boolean): boolean {
  return dailyCompleted !== true;
}

/** 追加タスク完了を履歴に書いてよいか（未完了セッションかつ同一キー未完了） */
export function canRecordExtraCompletion(input: {
  extraInProgress: boolean;
  lastFinishedKey: string | null;
  currentKey: string;
}): boolean {
  if (!input.extraInProgress) return false;
  if (input.lastFinishedKey !== null && input.lastFinishedKey === input.currentKey) {
    return false;
  }
  return true;
}
