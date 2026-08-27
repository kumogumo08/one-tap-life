import {
  canRecordExtraCompletion,
  canRecordMainCompletion,
  decideHomeRestoreKind,
  extraCompletionKey,
  shouldKeepIncompleteMainTask,
} from '@/src/lib/homeRestore';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function run(): void {
  // 1. 未完了追加 → 設定 → 戻る → 完了ボタン維持
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: true,
    }) === 'incomplete-extra',
    '未完了追加は incomplete-extra'
  );

  // 2. 未完了追加 → レベル変更 → 完了ボタン維持（判定は extraInProgress）
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: true,
    }) === 'incomplete-extra',
    'レベル変更しても extraInProgress なら incomplete-extra'
  );

  // 3. 追加完了後 → 設定 → 戻る → 完了ボタン復活しない
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'completed-main',
    '追加完了後は completed-main'
  );

  // currentIsExtra が残っていても未完了扱いしない（回帰防止）
  assert(
    decideHomeRestoreKind({
      savedCompleted: true,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'completed-main',
    'extraInProgress=false なら currentIsExtra 残留でも completed-main'
  );

  assert(
    decideHomeRestoreKind({
      savedCompleted: false,
      savedHasTask: true,
      extraInProgress: false,
    }) === 'incomplete-main',
    '未完了メインは incomplete-main'
  );

  // 1-3. 未完了メインはレベルが変わっても保存タスクを維持
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: false, savedHasTask: true }) === true,
    'メイン未完了は保存タスクを維持'
  );
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: true, savedHasTask: true }) === false,
    'メイン完了済みは keep しない'
  );
  assert(
    shouldKeepIncompleteMainTask({ savedCompleted: false, savedHasTask: false }) === false,
    '未抽選なら keep しない（次回新規は新レベル）'
  );

  assert(
    decideHomeRestoreKind({
      savedCompleted: false,
      savedHasTask: false,
      extraInProgress: false,
    }) === 'empty',
    'タスクなしは empty'
  );

  // 5. メインタスク完了 → 再完了できない
  assert(canRecordMainCompletion(false) === true, '未完了メインは記録可');
  assert(canRecordMainCompletion(true) === false, '完了済みメインは記録不可');

  // 4 / 6. 追加完了後の再完了・二重登録防止
  const key = extraCompletionKey('ストレッチ', 'task-1');
  assert(
    canRecordExtraCompletion({
      extraInProgress: true,
      lastFinishedKey: null,
      currentKey: key,
    }) === true,
    '未完了追加は記録可'
  );
  assert(
    canRecordExtraCompletion({
      extraInProgress: false,
      lastFinishedKey: key,
      currentKey: key,
    }) === false,
    '完了後 extraInProgress=false なら記録不可'
  );
  assert(
    canRecordExtraCompletion({
      extraInProgress: true,
      lastFinishedKey: key,
      currentKey: key,
    }) === false,
    '同一 extra key の再完了は記録不可'
  );
  assert(
    canRecordExtraCompletion({
      extraInProgress: true,
      lastFinishedKey: key,
      currentKey: extraCompletionKey('別タスク', 'task-2'),
    }) === true,
    '新しい追加セッションは記録可'
  );

  console.log('homeRestore tests passed');
}

run();
