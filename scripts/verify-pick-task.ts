/**
 * pickTask 抽選の調査用。アプリ本体の挙動は変えない。
 * 実行: npx tsx scripts/verify-pick-task.ts
 */
import { TASKS } from '@/src/data/tasks';
import { pickTask } from '@/src/lib/pickTask';
import { appendRecentTaskId } from '@/src/lib/recentTaskIds';
import type { Task, TaskKind, TaskLevel } from '@/src/types/task';

const LEVELS: TaskLevel[] = [1, 2, 3];
const KINDS: TaskKind[] = ['move', 'stretch', 'mind', 'rest'];
const N = 10_000;
const N_LARGE = 100_000;

function tasksFor(level: TaskLevel): Task[] {
  return TASKS.filter((t) => t.level === level);
}

function kindOf(id: string, level: TaskLevel): TaskKind | 'unknown' {
  return TASKS.find((t) => t.id === id && t.level === level)?.kind ?? 'unknown';
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

function pct(n: number, total: number): string {
  return `${((n / total) * 100).toFixed(3)}%`;
}

function theoreticalRates(level: TaskLevel) {
  const all = tasksFor(level);
  const counts: Record<TaskKind, number> = { move: 0, stretch: 0, mind: 0, rest: 0 };
  for (const t of all) counts[t.kind] += 1;
  const moveStretch = counts.move + counts.stretch;
  const bucketWeight = { moveStretch: 0.7, mind: 0.2, rest: 0.1 };
  const kindShare = {
    move: bucketWeight.moveStretch * (counts.move / moveStretch),
    stretch: bucketWeight.moveStretch * (counts.stretch / moveStretch),
    mind: bucketWeight.mind,
    rest: bucketWeight.rest,
  };
  const perTask = {
    move: bucketWeight.moveStretch / moveStretch,
    stretch: bucketWeight.moveStretch / moveStretch,
    mind: bucketWeight.mind / counts.mind,
    rest: bucketWeight.rest / counts.rest,
  };
  return { counts, moveStretch, kindShare, perTask };
}

type SeqResult = {
  kindCounts: Record<TaskKind | 'unknown', number>;
  taskCounts: Map<string, number>;
  sameTaskStreaks: number;
  kindRunMax: number;
  bodyRunMax: number; // move|stretch as one "body" group
  kindStreak3: number;
  kindStreak4: number;
  bodyStreak3: number;
  bodyStreak4: number;
  picks: { id: string; kind: TaskKind | 'unknown' }[];
};

function simulateSequential(
  level: TaskLevel,
  n: number,
  mode: 'persist-last' | 'reset-last'
): SeqResult {
  const kindCounts: Record<TaskKind | 'unknown', number> = {
    move: 0,
    stretch: 0,
    mind: 0,
    rest: 0,
    unknown: 0,
  };
  const taskCounts = new Map<string, number>();
  const picks: SeqResult['picks'] = [];
  let lastId: string | null = null;
  let sameTaskStreaks = 0;
  let kindRun = 0;
  let kindRunMax = 0;
  let prevKind: TaskKind | 'unknown' | null = null;
  let bodyRun = 0;
  let bodyRunMax = 0;
  let prevBody = false;
  let kindStreak3 = 0;
  let kindStreak4 = 0;
  let bodyStreak3 = 0;
  let bodyStreak4 = 0;

  for (let i = 0; i < n; i++) {
    const exclude = mode === 'persist-last' ? lastId : null;
    const picked = pickTask(level, exclude);
    const kind = kindOf(picked.id, level);
    kindCounts[kind] += 1;
    taskCounts.set(picked.id, (taskCounts.get(picked.id) ?? 0) + 1);

    if (lastId !== null && picked.id === lastId) sameTaskStreaks += 1;

    if (kind === prevKind) {
      kindRun += 1;
    } else {
      kindRun = 1;
      prevKind = kind;
    }
    if (kindRun > kindRunMax) kindRunMax = kindRun;
    if (kindRun === 3) kindStreak3 += 1;
    if (kindRun === 4) kindStreak4 += 1;

    const isBody = kind === 'move' || kind === 'stretch';
    if (isBody && prevBody) {
      bodyRun += 1;
    } else {
      bodyRun = 1;
    }
    prevBody = isBody;
    if (bodyRun > bodyRunMax) bodyRunMax = bodyRun;
    if (isBody && bodyRun === 3) bodyStreak3 += 1;
    if (isBody && bodyRun === 4) bodyStreak4 += 1;

    picks.push({ id: picked.id, kind });
    lastId = picked.id;
  }

  return {
    kindCounts,
    taskCounts,
    sameTaskStreaks,
    kindRunMax,
    bodyRunMax,
    kindStreak3,
    kindStreak4,
    bodyStreak3,
    bodyStreak4,
    picks,
  };
}

/** 1日1メイン（lastTaskId リセット）+ 任意で追加1回（last 引き継ぎ） */
function simulateDailyMainPlusExtra(level: TaskLevel, days: number, extraProb: number) {
  const mainIds: string[] = [];
  const extraIds: string[] = [];
  let sameMainAsYesterday = 0;
  let sameMainAsYesterdaysExtra = 0;
  let sameMainAsYesterdaysLast = 0;
  let extraSameAsMain = 0;

  let yMain: string | null = null;
  let yExtra: string | null = null;

  for (let d = 0; d < days; d++) {
    const main = pickTask(level, null);
    mainIds.push(main.id);
    if (yMain && main.id === yMain) sameMainAsYesterday += 1;
    if (yExtra && main.id === yExtra) sameMainAsYesterdaysExtra += 1;
    const yLast: string | null = yExtra ?? yMain;
    if (yLast && main.id === yLast) sameMainAsYesterdaysLast += 1;

    let extraId: string | null = null;
    if (Math.random() < extraProb) {
      const extra = pickTask(level, main.id);
      extraId = extra.id;
      extraIds.push(extra.id);
      if (extra.id === main.id) extraSameAsMain += 1;
    }
    yMain = main.id;
    yExtra = extraId;
  }

  return {
    mainIds,
    extraIds,
    sameMainAsYesterday,
    sameMainAsYesterdaysExtra,
    sameMainAsYesterdaysLast,
    extraSameAsMain,
  };
}

function reportTaskSpread(
  level: TaskLevel,
  taskCounts: Map<string, number>,
  n: number,
  theory: ReturnType<typeof theoreticalRates>
) {
  const all = tasksFor(level);
  const byKind: Record<TaskKind, number[]> = { move: [], stretch: [], mind: [], rest: [] };
  let max = { id: '', n: -1 };
  let min = { id: '', n: Infinity };

  for (const t of all) {
    const c = taskCounts.get(t.id) ?? 0;
    byKind[t.kind].push(c);
    if (c > max.n) max = { id: t.id, n: c };
    if (c < min.n) min = { id: t.id, n: c };
  }

  console.log(`    最大出現: ${max.id}  ${max.n}回 (${pct(max.n, n)})`);
  console.log(`    最小出現: ${min.id}  ${min.n}回 (${pct(min.n, n)})`);

  for (const k of KINDS) {
    const xs = byKind[k];
    const expectedEach = theory.perTask[k] * n;
    const avg = mean(xs);
    const sd = stddev(xs);
    const maxK = Math.max(...xs);
    const minK = Math.min(...xs);
    console.log(
      `    ${k}: 平均 ${avg.toFixed(1)} (理論 ${expectedEach.toFixed(1)})  sd ${sd.toFixed(1)}  min ${minK}  max ${maxK}  相対sd ${(sd / avg).toFixed(3)}`
    );
  }

  const missing = all.filter((t) => !taskCounts.has(t.id));
  if (missing.length) {
    console.log(`    一度も出なかった: ${missing.map((t) => t.id).join(', ')}`);
  }
}

function printDupes() {
  const ids = TASKS.map((t) => t.id);
  const seen = new Map<string, number>();
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
  const dups = [...seen.entries()].filter(([, c]) => c > 1);
  console.log(`TASKS 総数: ${TASKS.length}  重複ID: ${dups.length ? JSON.stringify(dups) : 'なし'}`);
}

/** 日次メイン: lastTaskId は日付変更で null。recentTaskIds は日またぎ保持 */
function simulateDailyWithRecent(level: TaskLevel, days: number) {
  const kindCounts: Record<TaskKind | 'unknown', number> = {
    move: 0,
    stretch: 0,
    mind: 0,
    rest: 0,
    unknown: 0,
  };
  const taskCounts = new Map<string, number>();
  const ids: string[] = [];
  let recent: string[] = [];
  let within3 = 0;
  let onDay4 = 0;

  for (let d = 0; d < days; d++) {
    const picked = pickTask(level, null, recent);
    if (recent.includes(picked.id)) within3 += 1;
    if (d >= 4 && ids[d - 4] === picked.id) onDay4 += 1;
    const kind = kindOf(picked.id, level);
    kindCounts[kind] += 1;
    taskCounts.set(picked.id, (taskCounts.get(picked.id) ?? 0) + 1);
    ids.push(picked.id);
    recent = appendRecentTaskId(recent, picked.id);
  }

  const body = kindCounts.move + kindCounts.stretch;
  return { kindCounts, taskCounts, ids, within3, onDay4, body };
}

function run(): void {
  printDupes();
  console.log('');
  console.log('========== 日次メイン 10,000日（recentTaskIds 日またぎ） ==========');

  for (const level of LEVELS) {
    const theory = theoreticalRates(level);
    const sim = simulateDailyWithRecent(level, N);
    const bodyPct = (sim.body / N) * 100;
    const mindPct = (sim.kindCounts.mind / N) * 100;
    const restPct = (sim.kindCounts.rest / N) * 100;
    console.log(`--- Level ${level} ---`);
    console.log(
      `  move+stretch ${bodyPct.toFixed(2)}% (理論 70)  mind ${mindPct.toFixed(2)}% (理論 20)  rest ${restPct.toFixed(2)}% (理論 10)`
    );
    console.log(
      `  kind: move ${pct(sim.kindCounts.move, N)} stretch ${pct(sim.kindCounts.stretch, N)} mind ${pct(sim.kindCounts.mind, N)} rest ${pct(sim.kindCounts.rest, N)}`
    );
    console.log(`  直近3件以内の再出: ${sim.within3}`);
    console.log(`  4日前と同じタスク: ${sim.onDay4} (${pct(sim.onDay4, N)})`);
    reportTaskSpread(level, sim.taskCounts, N, theory);
    if (sim.within3 !== 0) {
      throw new Error(`Lv${level}: 直近3件以内の再出が ${sim.within3} 件`);
    }
  }

  console.log('');


  for (const level of LEVELS) {
    const all = tasksFor(level);
    const theory = theoreticalRates(level);
    console.log(`========== Level ${level} ==========`);
    console.log(`  総タスク数: ${all.length}`);
    console.log(
      `  内訳: move ${theory.counts.move} / stretch ${theory.counts.stretch} / mind ${theory.counts.mind} / rest ${theory.counts.rest}`
    );
    console.log(`  move+stretch バケット: ${theory.moveStretch}件  重み 70%`);
    console.log('  --- 理論（lastId なし、2段階抽選） ---');
    console.log(
      `  カテゴリ出現率: move ${ (theory.kindShare.move * 100).toFixed(2) }%  stretch ${ (theory.kindShare.stretch * 100).toFixed(2) }%  mind ${ (theory.kindShare.mind * 100).toFixed(2) }%  rest ${ (theory.kindShare.rest * 100).toFixed(2) }%`
    );
    console.log(
      `  1タスクあたり: move ${ (theory.perTask.move * 100).toFixed(3) }%  stretch ${ (theory.perTask.stretch * 100).toFixed(3) }%  mind ${ (theory.perTask.mind * 100).toFixed(3) }%  rest ${ (theory.perTask.rest * 100).toFixed(3) }%`
    );

    console.log(`  --- シミュレーション persist-last ${N}回（追加タスク連続に相当） ---`);
    const persist = simulateSequential(level, N, 'persist-last');
    console.log(
      `  kind: move ${persist.kindCounts.move} (${pct(persist.kindCounts.move, N)})  stretch ${persist.kindCounts.stretch} (${pct(persist.kindCounts.stretch, N)})  mind ${persist.kindCounts.mind} (${pct(persist.kindCounts.mind, N)})  rest ${persist.kindCounts.rest} (${pct(persist.kindCounts.rest, N)})`
    );
    console.log(
      `  理論差: move ${(persist.kindCounts.move / N - theory.kindShare.move).toFixed(4)}  stretch ${(persist.kindCounts.stretch / N - theory.kindShare.stretch).toFixed(4)}  mind ${(persist.kindCounts.mind / N - theory.kindShare.mind).toFixed(4)}  rest ${(persist.kindCounts.rest / N - theory.kindShare.rest).toFixed(4)}`
    );
    console.log(`  同一タスク連続: ${persist.sameTaskStreaks}`);
    console.log(
      `  同一kind 3連続開始: ${persist.kindStreak3}  4連続開始: ${persist.kindStreak4}  最長kind連続: ${persist.kindRunMax}`
    );
    console.log(
      `  move|stretch 3連続開始: ${persist.bodyStreak3}  4連続開始: ${persist.bodyStreak4}  最長body連続: ${persist.bodyRunMax}`
    );
    reportTaskSpread(level, persist.taskCounts, N, theory);

    console.log(`  --- シミュレーション reset-last ${N}回（日次メイン＝lastTaskId リセットに相当） ---`);
    const reset = simulateSequential(level, N, 'reset-last');
    console.log(
      `  kind: move ${reset.kindCounts.move} (${pct(reset.kindCounts.move, N)})  stretch ${reset.kindCounts.stretch} (${pct(reset.kindCounts.stretch, N)})  mind ${reset.kindCounts.mind} (${pct(reset.kindCounts.mind, N)})  rest ${reset.kindCounts.rest} (${pct(reset.kindCounts.rest, N)})`
    );
    console.log(`  同一タスク連続（昨日と同じIDが翌日メインに出る回数）: ${reset.sameTaskStreaks}`);
    console.log(
      `  同一kind 3連続開始: ${reset.kindStreak3}  4連続開始: ${reset.kindStreak4}  最長kind連続: ${reset.kindRunMax}`
    );
    console.log(
      `  move|stretch 3連続開始: ${reset.bodyStreak3}  4連続開始: ${reset.bodyStreak4}  最長body連続: ${reset.bodyRunMax}`
    );
    reportTaskSpread(level, reset.taskCounts, N, theory);

    console.log(`  --- 日次メイン+50%追加 ${N}日 ---`);
    const daily = simulateDailyMainPlusExtra(level, N, 0.5);
    console.log(`  翌日メイン = 昨日メイン: ${daily.sameMainAsYesterday} (${pct(daily.sameMainAsYesterday, N)})`);
    console.log(
      `  翌日メイン = 昨日の追加: ${daily.sameMainAsYesterdaysExtra} (${pct(daily.sameMainAsYesterdaysExtra, N)})`
    );
    console.log(
      `  翌日メイン = 昨日の最後のタスク: ${daily.sameMainAsYesterdaysLast} (${pct(daily.sameMainAsYesterdaysLast, N)})`
    );
    console.log(
      `  追加 = 同日メイン: ${daily.extraSameAsMain} / ${daily.extraIds.length}`
    );

    const mainKindCounts: Record<TaskKind, number> = { move: 0, stretch: 0, mind: 0, rest: 0 };
    for (const id of daily.mainIds) {
      const k = kindOf(id, level);
      if (k !== 'unknown') mainKindCounts[k] += 1;
    }
    console.log(
      `  日次メイン kind: move ${pct(mainKindCounts.move, N)} stretch ${pct(mainKindCounts.stretch, N)} mind ${pct(mainKindCounts.mind, N)} rest ${pct(mainKindCounts.rest, N)}`
    );

    console.log(`  --- persist-last ${N_LARGE}回（安定統計） ---`);
    const persistL = simulateSequential(level, N_LARGE, 'persist-last');
    console.log(
      `  kind: move ${pct(persistL.kindCounts.move, N_LARGE)} stretch ${pct(persistL.kindCounts.stretch, N_LARGE)} mind ${pct(persistL.kindCounts.mind, N_LARGE)} rest ${pct(persistL.kindCounts.rest, N_LARGE)}`
    );
    console.log(`  同一タスク連続: ${persistL.sameTaskStreaks}`);
    console.log(
      `  同一kind 3連続開始: ${persistL.kindStreak3} (${pct(persistL.kindStreak3, N_LARGE)})  4連続: ${persistL.kindStreak4} (${pct(persistL.kindStreak4, N_LARGE)})  最長: ${persistL.kindRunMax}`
    );
    console.log(
      `  body 3連続開始: ${persistL.bodyStreak3} (${pct(persistL.bodyStreak3, N_LARGE)})  4連続: ${persistL.bodyStreak4} (${pct(persistL.bodyStreak4, N_LARGE)})  最長: ${persistL.bodyRunMax}`
    );
    reportTaskSpread(level, persistL.taskCounts, N_LARGE, theory);
    console.log('');
  }

  // 短期体感: 連続7日メイン（reset）を 2000 ウィンドウ
  console.log('========== 短期体感（7日メイン、lastリセット） ==========');
  for (const level of LEVELS) {
    const windows = 2000;
    let bodyAll7 = 0;
    let mindZero = 0;
    let restZero = 0;
    let sameTaskTwice = 0;
    let kind3plus = 0;
    for (let w = 0; w < windows; w++) {
      const kinds: TaskKind[] = [];
      const ids: string[] = [];
      for (let d = 0; d < 7; d++) {
        const p = pickTask(level, null);
        const k = kindOf(p.id, level);
        if (k === 'unknown') continue;
        kinds.push(k);
        ids.push(p.id);
      }
      if (kinds.every((k) => k === 'move' || k === 'stretch')) bodyAll7 += 1;
      if (!kinds.includes('mind')) mindZero += 1;
      if (!kinds.includes('rest')) restZero += 1;
      if (new Set(ids).size < ids.length) sameTaskTwice += 1;
      let run = 1;
      let hit3 = false;
      for (let i = 1; i < kinds.length; i++) {
        run = kinds[i] === kinds[i - 1] ? run + 1 : 1;
        if (run >= 3) hit3 = true;
      }
      if (hit3) kind3plus += 1;
    }
    console.log(
      `  Lv${level} 7日間x${windows}: 運動系だけ ${bodyAll7} (${pct(bodyAll7, windows)})  mindなし ${mindZero} (${pct(mindZero, windows)})  restなし ${restZero} (${pct(restZero, windows)})  同一タスク2回以上 ${sameTaskTwice} (${pct(sameTaskTwice, windows)})  同一kind3連続あり ${kind3plus} (${pct(kind3plus, windows)})`
    );
  }
}

run();
