// src/data/tasks.ts

import type { Task, TaskKind, TaskLevel } from '@/src/types/task';

export type { Task, TaskKind, TaskLevel };

export const TASKS: Task[] = [
  // --- rest (Lv1) ---
  { id: 'drink-water', label: '水をコップ1杯飲む', level: 1, kind: 'rest' },
  { id: 'deep-breath', label: '深呼吸を5回する\n（4秒吸って6秒吐く）', level: 1, kind: 'rest' },
  { id: 'eyes-closed', label: '目を閉じて30秒何もしない', level: 1, kind: 'rest' },
  { id: 'phone-down', label: 'スマホを伏せて30秒置く', level: 1, kind: 'rest' },
  { id: 'warm-eyes', label: '目を温める（手で覆う）30秒', level: 1, kind: 'rest' },
  { id: 'yawn', label: 'あくびを我慢せず1回する', level: 1, kind: 'rest' },

  // --- move (Lv1) ---
  { id: 'march-in-place', label: 'その場で足踏み30秒', level: 1, kind: 'move' },
  { id: 'heel-raise', label: 'かかとを上げ下げ20回', level: 1, kind: 'move' },
  { id: 'thigh-tension', label: '太ももに力を入れて\n5秒×3回', level: 1, kind: 'move' },
  { id: 'squat-10', label: 'スクワット10回', level: 1, kind: 'move' },
  { id: 'wall-pushup-10', label: '壁腕立て10回', level: 1, kind: 'move' },
  // ID は calf-raise-30 のまま（履歴はラベル文字列保存のため既存履歴は影響なし）
  { id: 'calf-raise-30', label: 'かかとを上げ下げ30回', level: 1, kind: 'move' },
  { id: 'glute-squeeze', label: 'お尻に力を入れて5秒×5回', level: 1, kind: 'move' },
  { id: 'stand-up-3', label: '椅子から立つ→座る×3回', level: 1, kind: 'move' },
  { id: 'toe-walk-30', label: 'つま先立ちでその場歩き\n30秒', level: 1, kind: 'move' },

  // --- stretch (Lv1) ---
  { id: 'shoulder-roll', label: '肩を大きく10回回す', level: 1, kind: 'stretch' },
  { id: 'neck-stretch', label: '首を左右にゆっくり5回倒す', level: 1, kind: 'stretch' },
  { id: 'posture-hold', label: '背筋を伸ばして30秒キープ', level: 1, kind: 'stretch' },
  { id: 'chest-open', label: '胸を開くストレッチ30秒', level: 1, kind: 'stretch' },
  { id: 'drop-shoulders', label: '肩の力を抜いてストンと\n落とす×3回', level: 1, kind: 'stretch' },
  { id: 'side-bend', label: '体を左右に倒すストレッチ各5回', level: 1, kind: 'stretch' },
  { id: 'arm-circle', label: '腕を前回し10回＋後ろ回し10回', level: 1, kind: 'stretch' },

  // --- mind (Lv1) ---
  { id: 'emotion-label', label: '今の気分を一言で頭の中で言う', level: 1, kind: 'mind' },
  { id: 'recall-success', label: '今日できたことを1つ思い出す', level: 1, kind: 'mind' },
  { id: 'desk-tidy', label: '机の上の物を1つ片付ける', level: 1, kind: 'mind' },
  { id: 'throw-away', label: 'ゴミを1つ捨てる', level: 1, kind: 'mind' },
  { id: 'air-refresh', label: '窓を少し開けて空気を入れ替える', level: 1, kind: 'mind' },

  // =========================
  // ✅ Level 2 (標準健康強度)
  // =========================

  // --- move (Lv2) ---
  { id: 'lv2-pushup-10', label: '腕立て伏せ 10回', level: 2, kind: 'move', seconds: 60 },
  { id: 'lv2-squat-20', label: 'スクワット 20回', level: 2, kind: 'move', seconds: 60 },
  { id: 'lv2-highknees-30s', label: 'もも上げ 30秒', level: 2, kind: 'move', seconds: 30 },
  { id: 'lv2-crunch-15', label: '腹筋 15回', level: 2, kind: 'move', seconds: 60 },
  { id: 'lv2-jog-60s', label: 'その場ジョギング 1分', level: 2, kind: 'move', seconds: 60 },
  { id: 'lv2-shadowboxing-60s', label: 'シャドーボクシング 1分', level: 2, kind: 'move', seconds: 60 },
  { id: 'lv2-wall-sit-30s', label: '壁なし空気椅子 30秒', level: 2, kind: 'move', seconds: 45 },
  { id: 'lv2-arm-punch-60s', label: 'その場パンチ連続 1分', level: 2, kind: 'move', seconds: 60 },
  {
    id: 'lv2-jumpingjack-20',
    label: 'ジャンピングジャック 20回',
    level: 2,
    kind: 'move',
    seconds: 45,
    description:
      '立った姿勢からジャンプします。\n足を開きながら両手を頭の上で合わせます。\n戻して1回です。'
  },
  
  {
    id: 'lv2-mountain-climber-30s',
    label: 'マウンテンクライマー 30秒',
    level: 2,
    kind: 'move',
    seconds: 30,
    description:
      '腕立ての姿勢になります。\nひざを胸に近づけるように\n交互にテンポよく動かします。'
  },
  
  {
    id: 'lv2-plank-30s',
    label: 'プランク 30秒',
    level: 2,
    kind: 'move',
    seconds: 45,
    description:
      'うつ伏せになります。\nひじとつま先で体を支えます。\n体をまっすぐにして止まります。'
  },
  
  {
    id: 'lv2-side-plank-20each',
    label: 'サイドプランク 左右20秒',
    level: 2,
    kind: 'move',
    seconds: 60,
    description:
      '横向きになります。\nひじと足で体を支えます。\n体をまっすぐにして止まります。\n反対側も同じ。'
  },
  
  {
    id: 'lv2-lunge-10each',
    label: 'ランジ 10回ずつ',
    level: 2,
    kind: 'move',
    seconds: 90,
    description:
      '片足を前に出します。\nひざを曲げて腰を下げます。\n元に戻します。左右それぞれ行います。'
  },
  
  {
    id: 'lv2-step-back-lunge-12each',
    label: 'バックランジ 12回ずつ',
    level: 2,
    kind: 'move',
    seconds: 90,
    description:
      '立ったまま片足を後ろに引きます。\n前の足を曲げて腰を下げます。\n戻します。左右行います。'
  },
  
  {
    id: 'lv2-glute-bridge-15',
    label: 'ヒップリフト 15回',
    level: 2,
    kind: 'move',
    seconds: 60,
    description:
      'あお向けになります。\nひざを立てます。\nお尻を持ち上げて戻します。'
  },

  // --- stretch (Lv2) ---
  { id: 'lv2-shoulder-roll-20', label: '肩回し 20回', level: 2, kind: 'stretch', seconds: 45 },
  { id: 'lv2-neck-stretch-10s', label: '首ストレッチ 左右10秒', level: 2, kind: 'stretch', seconds: 30 },
  { id: 'lv2-forward-fold-30s', label: '前屈ストレッチ 30秒', level: 2, kind: 'stretch', seconds: 30 },
  {
    id: 'lv2-side-stretch-15s',
    label: '体側伸ばし 左右15秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '立ったまま片手を上げます。\n体を横に倒してわき腹を伸ばします。\n反対側も行います。'
  },
  
  {
    id: 'lv2-hamstring-30s',
    label: '太もも裏ストレッチ 30秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '足を伸ばして座ります。\n上体をゆっくり前に倒します。\n太ももの裏を伸ばします。'
  },
  
  {
    id: 'lv2-calf-stretch-30s',
    label: 'ふくらはぎ伸ばし 30秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '片足を後ろに引きます。\nかかとを床につけたまま体を前に倒します。\n反対側も行います。'
  },
  

  // --- mind (Lv2) ---
  { id: 'lv2-breath-meditation-60s', label: '1分間の呼吸瞑想', level: 2, kind: 'mind', seconds: 60 },
  { id: 'lv2-pick-one', label: '今日やることを1つ決める', level: 2, kind: 'mind', seconds: 60 },
  { id: 'lv2-one-gratitude', label: '感謝を1つ思い出す', level: 2, kind: 'mind', seconds: 45 },
  {
    id: 'lv2-observe-thoughts-60s',
    label: '目を閉じて雑念を観察 1分',
    level: 2,
    kind: 'mind',
    seconds: 60,
    description:
      '目を閉じます。\n浮かんでくる考えを\nただそのまま見送ります。\n止めなくて大丈夫です。'
  },
  
  {
    id: 'lv2-name-feeling',
    label: '今の感情を言語化する',
    level: 2,
    kind: 'mind',
    seconds: 60,
    description:
      '今の気分を一言で考えます。\n良い悪いは判断しません。\nただ名前をつけます。'
  },

    // --- rest (Lv2) ---
    { id: 'lv2-breath-1min', label: '1分間ゆっくり呼吸する\n（4秒吸って6秒吐く）', level: 2, kind: 'rest', seconds: 60 },
    { id: 'lv2-eyes-closed-60s', label: '目を閉じて1分何もしない', level: 2, kind: 'rest', seconds: 60 },
    { id: 'lv2-phone-away-2min', label: 'スマホを2分触らない', level: 2, kind: 'rest', seconds: 120 },
    { id: 'lv2-warm-eyes-60s', label: '目を手で覆って1分温める', level: 2, kind: 'rest', seconds: 60 },
    { id: 'lv2-sit-still-90s', label: '背筋を伸ばして90秒静かに座る', level: 2, kind: 'rest', seconds: 90 },
    { id: 'lv2-shoulder-release-60s', label: '肩の力を抜いて1分リラックス', level: 2, kind: 'rest', seconds: 60 },
    { id: 'lv2-body-scan-90s', label: '体の感覚を順番に意識する\n（ボディスキャン90秒）', level: 2, kind: 'rest', seconds: 90 },
    { id: 'lv2-slow-blink-30', label: 'ゆっくりまばたきを30秒続ける', level: 2, kind: 'rest', seconds: 30 },
    { id: 'lv2-gratitude-breath', label: '感謝を1つ思い浮かべながら呼吸1分', level: 2, kind: 'rest', seconds: 60 },
    { id: 'lv2-silent-min', label: '音を止めて1分静寂を味わう', level: 2, kind: 'rest', seconds: 60 },
  
];

export const LEVEL2_TASKS = TASKS.filter(t => t.level === 2);
export const levelTasks = (level: TaskLevel) => TASKS.filter(t => t.level === level);
export const levelTasksByKind = (level: TaskLevel, kind: TaskKind) =>
  TASKS.filter(t => t.level === level && t.kind === kind);

/** 表示用ラベルから説明文を取得（TASK_DESC の代替・単一ソース化） */
export const getDescriptionByLabel = (label: string): string => {
  const t = TASKS.find((x) => x.label === label);
  return t?.description ?? '';
};
