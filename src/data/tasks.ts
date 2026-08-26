// src/data/tasks.ts

import type { Task, TaskKind, TaskLevel } from '@/src/types/task';

export type { Task, TaskKind, TaskLevel };

export const TASKS: Task[] = [
  // =========================
  // ✅ Level 1（軽い生活改善）
  // =========================

  // --- rest (Lv1) ---

  {
    id: 'drink-water',
    label: '水をコップ1杯飲む',
    level: 1,
    kind: 'rest',
    seconds: 30,
    description:
      'のどが渇いていたら水分をとります。\n一気に飲まず、無理のない量で大丈夫です。',
  },

  {
    id: 'deep-breath',
    label: 'ゆっくり呼吸を5回する\n（4秒吸って6秒吐く）',
    level: 1,
    kind: 'rest',
    seconds: 50,
    description:
      '鼻からゆっくり息を吸い、\nそれより少し長く息を吐きます。\n苦しくない範囲で行います。',
  },

  {
    id: 'eyes-closed',
    label: '目を閉じて30秒休む',
    level: 1,
    kind: 'rest',
    seconds: 30,
  },

  {
    id: 'phone-down',
    label: 'スマホ・画面から30秒離れる',
    level: 1,
    kind: 'rest',
    seconds: 30,
    description:
      'スマホやパソコンから目を離します。\n画面を見ずに30秒休みます。',
  },

  {
    id: 'look-far-20s',
    label: '20秒間、遠くを見る',
    level: 1,
    kind: 'rest',
    seconds: 20,
    description:
      'スマホや画面から目を離して、\nできるだけ遠くの物を20秒眺めます。',
  },

  {
    id: 'relax-face-30s',
    label: '肩・あご・顔の力を30秒抜く',
    level: 1,
    kind: 'rest',
    seconds: 30,
    description:
      '肩を下げます。\n歯を食いしばらず、あごをゆるめます。\n顔の力も抜いて休みます。',
  },

  {
    id: 'sit-back-30s',
    label: '椅子にもたれて30秒休む',
    level: 1,
    kind: 'rest',
    seconds: 30,
    description:
      '椅子の背もたれに体を預けます。\n肩と腕の力を抜いて休みます。',
  },

  {
    id: 'slow-blink-20s',
    label: 'ゆっくりまばたきを20秒する',
    level: 1,
    kind: 'rest',
    seconds: 20,
    description:
      '画面から目を離し、\n力を入れずゆっくりまばたきします。',
  },

  // --- move (Lv1) ---

  {
    id: 'march-in-place',
    label: 'その場で足踏み30秒',
    level: 1,
    kind: 'move',
    seconds: 30,
  },

  {
    id: 'calf-raise-30',
    label: 'かかとを上げ下げ20回',
    level: 1,
    kind: 'move',
    seconds: 30,
    description:
      '立った姿勢でかかとをゆっくり上げます。\n床へ戻して1回です。\n転倒しそうなら壁や椅子につかまります。',
  },

  {
    id: 'thigh-tension',
    label: '太ももに力を入れる\n5秒×3回',
    level: 1,
    kind: 'move',
    seconds: 20,
    description:
      '座ったままでもできます。\n太ももに5秒力を入れて抜きます。\n3回繰り返します。',
  },

  {
    id: 'squat-10',
    label: 'スクワット10回',
    level: 1,
    kind: 'move',
    seconds: 45,
    description:
      '足を肩幅くらいに開きます。\nひざとつま先の向きをそろえ、\n無理のない深さまで腰を下げます。',
  },

  {
    id: 'wall-pushup-10',
    label: '壁腕立て10回',
    level: 1,
    kind: 'move',
    seconds: 30,
    description:
      '壁に両手をつきます。\n体をまっすぐにしたまま\n胸を壁へ近づけて戻します。',
  },

  {
    id: 'stand-up-5',
    label: '椅子から立つ→座る 5回',
    level: 1,
    kind: 'move',
    seconds: 30,
    description:
      '椅子から立ち上がり、\nゆっくり座ります。\n5回繰り返します。',
  },

  {
    id: 'walk-60s',
    label: '立って1分歩く',
    level: 1,
    kind: 'move',
    seconds: 60,
    description:
      '部屋の中でも大丈夫です。\n座りっぱなしを中断して\n無理のない速さで歩きます。',
  },

  {
    id: 'knee-lift-10each',
    label: 'ひざを交互に10回ずつ上げる',
    level: 1,
    kind: 'move',
    seconds: 30,
    description:
      '立った姿勢で左右のひざを\n交互にゆっくり上げます。\n必要なら壁につかまります。',
  },

  {
    id: 'stand-and-reach',
    label: '立って両手を上に伸ばす×5回',
    level: 1,
    kind: 'move',
    seconds: 30,
    description:
      '立ち上がって両手を頭の上へ伸ばします。\nゆっくり戻して5回繰り返します。',
  },

  // --- stretch (Lv1) ---

  {
    id: 'shoulder-roll',
    label: '肩を大きく10回回す',
    level: 1,
    kind: 'stretch',
    seconds: 30,
  },

  {
    id: 'neck-stretch',
    label: '首を左右に10秒ずつ伸ばす',
    level: 1,
    kind: 'stretch',
    seconds: 20,
    description:
      '首をゆっくり横へ傾けます。\n痛みのない範囲で10秒キープし、\n反対側も行います。',
  },

  {
    id: 'posture-reset',
    label: '姿勢を整えて30秒座る',
    level: 1,
    kind: 'stretch',
    seconds: 30,
    description:
      '足を床につけて座ります。\n背中を無理に反らさず、\n頭が上へ伸びるイメージで座ります。',
  },

  {
    id: 'chest-open',
    label: '胸を開くストレッチ30秒',
    level: 1,
    kind: 'stretch',
    seconds: 30,
    description:
      '肩をゆっくり後ろへ引きます。\n胸の前側が軽く伸びる位置で\n無理なくキープします。',
  },

  {
    id: 'drop-shoulders',
    label: '肩をすくめてストンと落とす×5回',
    level: 1,
    kind: 'stretch',
    seconds: 20,
    description:
      '肩を耳へ近づけるように持ち上げ、\n力を抜いてストンと下ろします。',
  },

  {
    id: 'side-bend',
    label: '体を左右にゆっくり倒す×5回',
    level: 1,
    kind: 'stretch',
    seconds: 30,
    description:
      '上体を左右へゆっくり倒します。\n反動をつけず、\n気持ちいい範囲で行います。',
  },

  {
    id: 'arm-circle',
    label: '腕を前5回＋後ろ5回回す',
    level: 1,
    kind: 'stretch',
    seconds: 30,
  },

  {
    id: 'ankle-circle',
    label: '足首を左右5回ずつ回す',
    level: 1,
    kind: 'stretch',
    seconds: 30,
    description:
      '椅子に座って片足を少し浮かせます。\n足首をゆっくり回します。\n反対側も行います。',
  },

  // --- mind (Lv1) ---

  {
    id: 'emotion-label',
    label: '今の気分を一言で表す',
    level: 1,
    kind: 'mind',
    seconds: 30,
    description:
      '「疲れた」「安心」「イライラ」など、\n今の感情に一言だけ名前をつけます。\n良い悪いは判断しません。',
  },

  {
    id: 'recall-success',
    label: '今日できたことを1つ思い出す',
    level: 1,
    kind: 'mind',
    seconds: 30,
    description:
      '大きな成果でなくて大丈夫です。\n今日できたことを1つ思い出します。',
  },

  {
    id: 'one-next-action',
    label: '次にやることを1つだけ決める',
    level: 1,
    kind: 'mind',
    seconds: 30,
    description:
      '全部を考えず、\n次にする小さな行動を\n1つだけ決めます。',
  },

  {
    id: 'desk-tidy',
    label: '目の前の物を1つ片付ける',
    level: 1,
    kind: 'mind',
    seconds: 30,
    description:
      '全部片付けなくて大丈夫です。\n目の前にある物を\n1つだけ元の場所へ戻します。',
  },

  {
    id: 'one-gratitude-lv1',
    label: 'ありがたいことを1つ思い出す',
    level: 1,
    kind: 'mind',
    seconds: 30,
    description:
      '人、物、出来事など何でも大丈夫です。\nありがたいと思えることを\n1つだけ思い出します。',
  },

  {
    id: 'notice-body',
    label: '今の体の感覚を1つ確認する',
    level: 1,
    kind: 'mind',
    seconds: 30,
    description:
      '肩が重い、眠い、お腹が空いたなど、\n今感じている体の感覚を\n1つ確認します。',
  },

  {
    id: 'one-positive',
    label: '今日よかったことを1つ思い出す',
    level: 1,
    kind: 'mind',
    seconds: 30,
  },

  {
    id: 'pause-before-next',
    label: '次の行動の前に30秒だけ止まる',
    level: 1,
    kind: 'mind',
    seconds: 30,
    description:
      'すぐ次へ進まず、30秒だけ止まります。\n今何をしようとしているかを\n確認してから動きます。',
  },

  // =========================
  // ✅ Level 2（標準）
  // =========================

  // --- move (Lv2) ---

  {
    id: 'lv2-pushup-10',
    label: '腕立て伏せ 10回',
    level: 2,
    kind: 'move',
    seconds: 60,
  },

  {
    id: 'lv2-squat-20',
    label: 'スクワット 20回',
    level: 2,
    kind: 'move',
    seconds: 60,
  },

  {
    id: 'lv2-highknees-30s',
    label: 'もも上げ 30秒',
    level: 2,
    kind: 'move',
    seconds: 30,
  },

  {
    id: 'lv2-crunch-15',
    label: '腹筋 15回',
    level: 2,
    kind: 'move',
    seconds: 60,
  },

  {
    id: 'lv2-jog-60s',
    label: 'その場ジョギング 1分',
    level: 2,
    kind: 'move',
    seconds: 60,
  },

  {
    id: 'lv2-shadowboxing-60s',
    label: 'シャドーボクシング 1分',
    level: 2,
    kind: 'move',
    seconds: 60,
    description:
      'その場で構えます。\n左右のパンチを交互に出します。\n無理のないテンポで1分続けます。',
  },

  {
    id: 'lv2-wall-sit-30s',
    label: '壁を使って空気椅子 30秒',
    level: 2,
    kind: 'move',
    seconds: 30,
    description:
      '壁に背中をつけます。\nひざを曲げて腰を下げます。\n太ももに負荷がかかる位置で\n30秒キープします。',
  },

  {
    id: 'lv2-jumpingjack-20',
    label: 'ジャンピングジャック 20回',
    level: 2,
    kind: 'move',
    seconds: 45,
    description:
      '立った姿勢からジャンプします。\n足を開きながら両手を頭の上へ上げます。\n元の姿勢に戻して1回です。',
  },

  {
    id: 'lv2-mountain-climber-30s',
    label: 'マウンテンクライマー 30秒',
    level: 2,
    kind: 'move',
    seconds: 30,
    description:
      '腕立ての姿勢になります。\nひざを胸に近づけるように\n左右交互にテンポよく動かします。',
  },

  {
    id: 'lv2-plank-30s',
    label: 'プランク 30秒',
    level: 2,
    kind: 'move',
    seconds: 30,
    description:
      'うつ伏せになります。\nひじとつま先で体を支えます。\n頭からかかとまでを\nまっすぐにしてキープします。',
  },

  {
    id: 'lv2-side-plank-20each',
    label: 'サイドプランク 左右20秒',
    level: 2,
    kind: 'move',
    seconds: 50,
    description:
      '横向きになります。\nひじと足で体を支えます。\n体をまっすぐにして20秒キープします。\n反対側も同じように行います。',
  },

  {
    id: 'lv2-lunge-10each',
    label: 'ランジ 左右10回',
    level: 2,
    kind: 'move',
    seconds: 90,
    description:
      '片足を前に出します。\n両ひざを曲げながら腰を下げます。\n元に戻します。\n左右それぞれ行います。',
  },

  {
    id: 'lv2-step-back-lunge-12each',
    label: 'バックランジ 左右12回',
    level: 2,
    kind: 'move',
    seconds: 90,
    description:
      '立った状態から片足を後ろへ引きます。\n前のひざを曲げながら腰を下げます。\n元に戻します。\n左右それぞれ行います。',
  },

  {
    id: 'lv2-glute-bridge-15',
    label: 'ヒップリフト 15回',
    level: 2,
    kind: 'move',
    seconds: 60,
    description:
      'あお向けになってひざを立てます。\nお尻を持ち上げます。\n肩からひざまでが一直線になる位置から\nゆっくり戻します。',
  },

  // --- stretch (Lv2) ---

  {
    id: 'lv2-shoulder-roll-20',
    label: '肩を大きく20回回す',
    level: 2,
    kind: 'stretch',
    seconds: 45,
  },

  {
    id: 'lv2-neck-stretch-10s',
    label: '首ストレッチ 左右10秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '首をゆっくり横へ傾けます。\n痛みのない範囲で10秒伸ばします。\n反対側も行います。',
  },

  {
    id: 'lv2-forward-fold-30s',
    label: '前屈ストレッチ 30秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '上体をゆっくり前へ倒します。\n無理に深く曲げず、\n気持ちいい範囲でキープします。',
  },

  {
    id: 'lv2-side-stretch-15s',
    label: '体側伸ばし 左右15秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '立ったまま片手を上げます。\n体を横へ倒してわき腹を伸ばします。\n反対側も行います。',
  },

  {
    id: 'lv2-hamstring-30s',
    label: '太もも裏ストレッチ 30秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '足を伸ばして座ります。\n上体をゆっくり前へ倒します。\n太ももの裏を気持ちいい範囲で伸ばします。',
  },

  {
    id: 'lv2-calf-stretch-30s',
    label: 'ふくらはぎ伸ばし 左右15秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '片足を後ろへ引きます。\nかかとを床につけたまま体を前へ移動します。\n15秒伸ばしたら反対側も行います。',
  },

  {
    id: 'lv2-chest-open-30s',
    label: '胸を開くストレッチ 30秒',
    level: 2,
    kind: 'stretch',
    seconds: 30,
    description:
      '両肩をゆっくり後ろへ引きます。\n胸を開くようにして\n無理のない範囲で30秒伸ばします。',
  },

  {
    id: 'lv2-full-body-stretch-60s',
    label: '全身をゆっくり伸ばす 1分',
    level: 2,
    kind: 'stretch',
    seconds: 60,
    description:
      '両手を上へ伸ばします。\n背中や体側もゆっくり伸ばしながら\n1分間体をほぐします。',
  },

  // --- mind (Lv2) ---

  {
    id: 'lv2-breath-meditation-60s',
    label: '呼吸に意識を向ける 1分',
    level: 2,
    kind: 'mind',
    seconds: 60,
    description:
      '自然に呼吸します。\n息が入る感覚と出ていく感覚に\n意識を向けます。',
  },

  {
    id: 'lv2-pick-one',
    label: '今日やることを1つ決める',
    level: 2,
    kind: 'mind',
    seconds: 60,
    description:
      '全部を決めなくて大丈夫です。\n今日やりたいことを\n1つだけ決めます。',
  },

  {
    id: 'lv2-one-gratitude',
    label: '感謝できることを1つ思い出す',
    level: 2,
    kind: 'mind',
    seconds: 45,
  },

  {
    id: 'lv2-observe-thoughts-60s',
    label: '浮かぶ考えを観察する 1分',
    level: 2,
    kind: 'mind',
    seconds: 60,
    description:
      '目を閉じます。\n浮かんでくる考えを止めようとせず、\nただ気づいて見送ります。',
  },

  {
    id: 'lv2-name-feeling',
    label: '今の感情を一言で表す',
    level: 2,
    kind: 'mind',
    seconds: 60,
    description:
      '今の気分を一言で考えます。\n良い悪いは判断せず、\nただ名前をつけます。',
  },

  {
    id: 'lv2-recall-success-two',
    label: '今日できたことを2つ思い出す',
    level: 2,
    kind: 'mind',
    seconds: 60,
    description:
      '小さなことで大丈夫です。\n今日できたことを\n2つ思い出します。',
  },

  {
    id: 'lv2-release-one',
    label: '気になっていることを1つ整理する',
    level: 2,
    kind: 'mind',
    seconds: 60,
    description:
      '今気になっていることを1つ選びます。\n何が気になっているのかを\n頭の中で簡単に整理します。',
  },

  {
    id: 'lv2-tomorrow-one',
    label: '明日やりたいことを1つ考える',
    level: 2,
    kind: 'mind',
    seconds: 60,
  },

  // --- rest (Lv2) ---

  {
    id: 'lv2-breath-1min',
    label: '1分間ゆっくり呼吸する\n（4秒吸って6秒吐く）',
    level: 2,
    kind: 'rest',
    seconds: 60,
  },

  {
    id: 'lv2-eyes-closed-60s',
    label: '目を閉じて1分何もしない',
    level: 2,
    kind: 'rest',
    seconds: 60,
  },

  {
    id: 'lv2-phone-away-2min',
    label: 'スマホを2分触らない',
    level: 2,
    kind: 'rest',
    seconds: 120,
  },

  {
    id: 'lv2-warm-eyes-60s',
    label: '目を手で覆って1分休ませる',
    level: 2,
    kind: 'rest',
    seconds: 60,
    description:
      '目を閉じます。\n目を押さえずに手のひらで軽く覆います。\nそのまま1分休みます。',
  },

  {
    id: 'lv2-sit-still-90s',
    label: '楽な姿勢で90秒静かに座る',
    level: 2,
    kind: 'rest',
    seconds: 90,
    description:
      '椅子に楽な姿勢で座ります。\n肩や腕の力を抜いて\n90秒静かに休みます。',
  },

  {
    id: 'lv2-shoulder-release-60s',
    label: '肩の力を抜いて1分休む',
    level: 2,
    kind: 'rest',
    seconds: 60,
  },

  {
    id: 'lv2-body-scan-90s',
    label: '体の感覚を順番に意識する\n（ボディスキャン90秒）',
    level: 2,
    kind: 'rest',
    seconds: 90,
    description:
      '足から頭まで順番に意識します。\n温かさ、重さ、力みなどを\n変えようとせず感じます。',
  },

  {
    id: 'lv2-slow-blink-30',
    label: 'ゆっくりまばたきを30秒続ける',
    level: 2,
    kind: 'rest',
    seconds: 30,
  },

  {
    id: 'lv2-silent-min',
    label: '音を止めて1分静かに過ごす',
    level: 2,
    kind: 'rest',
    seconds: 60,
  },

  {
    id: 'lv2-look-far-60s',
    label: '遠くを眺めて目を休める 30秒',
    level: 2,
    kind: 'rest',
    seconds: 30,
    description:
      'スマホや画面から目を離します。\nできるだけ遠くを\n力を入れずに眺めます。',
  },
  
      // =========================
  // ✅ Level 3（高強度）
  // =========================

  // --- move (Lv3) ---

  {
    id: 'lv3-pushup-20',
    label: '腕立て伏せ 20回',
    level: 3,
    kind: 'move',
    seconds: 90,
  },

  {
    id: 'lv3-squat-30',
    label: 'スクワット 30回',
    level: 3,
    kind: 'move',
    seconds: 90,
  },

  {
    id: 'lv3-highknees-60s',
    label: 'もも上げ 1分',
    level: 3,
    kind: 'move',
    seconds: 60,
  },

  {
    id: 'lv3-crunch-25',
    label: '腹筋 25回',
    level: 3,
    kind: 'move',
    seconds: 90,
  },

  {
    id: 'lv3-jog-120s',
    label: 'その場ジョギング 2分',
    level: 3,
    kind: 'move',
    seconds: 120,
  },

  {
    id: 'lv3-shadowboxing-120s',
    label: 'シャドーボクシング 2分',
    level: 3,
    kind: 'move',
    seconds: 120,
  },

  {
    id: 'lv3-wall-sit-60s',
    label: '壁を使って空気椅子 1分',
    level: 3,
    kind: 'move',
    seconds: 60,
    description:
      '壁に背中をつけます。\nひざを曲げて腰を下げます。\n太ももに負荷がかかる位置で\n姿勢をキープします。',
  },

  {
    id: 'lv3-jumpingjack-40',
    label: 'ジャンピングジャック 40回',
    level: 3,
    kind: 'move',
    seconds: 90,
    description:
      '立った姿勢からジャンプします。\n足を開きながら両手を頭の上へ上げます。\n元の姿勢に戻して1回です。',
  },

  {
    id: 'lv3-mountain-climber-45s',
    label: 'マウンテンクライマー 45秒',
    level: 3,
    kind: 'move',
    seconds: 45,
    description:
      '腕立ての姿勢になります。\nひざを胸に近づけるように\n左右交互にテンポよく動かします。',
  },

  {
    id: 'lv3-plank-60s',
    label: 'プランク 1分',
    level: 3,
    kind: 'move',
    seconds: 60,
    description:
      'うつ伏せになります。\nひじとつま先で体を支えます。\n頭からかかとまでを\nまっすぐにしてキープします。',
  },

  {
    id: 'lv3-side-plank-30each',
    label: 'サイドプランク 左右30秒',
    level: 3,
    kind: 'move',
    seconds: 75,
    description:
      '横向きになり、ひじと足で体を支えます。\n体をまっすぐにして30秒キープします。\n反対側も同じように行います。',
  },

  {
    id: 'lv3-lunge-15each',
    label: 'ランジ 左右15回',
    level: 3,
    kind: 'move',
    seconds: 120,
    description:
      '片足を前に出します。\n両ひざを曲げながら腰を下げます。\n元に戻して繰り返します。\n左右それぞれ行います。',
  },

  {
    id: 'lv3-back-lunge-15each',
    label: 'バックランジ 左右15回',
    level: 3,
    kind: 'move',
    seconds: 120,
    description:
      '立った状態から片足を後ろへ引きます。\n腰をゆっくり下げてから戻します。\n左右それぞれ行います。',
  },

  {
    id: 'lv3-glute-bridge-25',
    label: 'ヒップリフト 25回',
    level: 3,
    kind: 'move',
    seconds: 90,
    description:
      'あお向けになってひざを立てます。\nお尻を持ち上げて\n肩からひざまでを一直線にします。\nゆっくり戻します。',
  },

  {
    id: 'lv3-burpee-8',
    label: 'バーピー 8回',
    level: 3,
    kind: 'move',
    seconds: 90,
    description:
      '立った姿勢からしゃがみます。\n両手を床について足を後ろへ伸ばします。\n足を戻して立ち上がります。\n無理のない速さで行います。',
  },

  // --- stretch (Lv3) ---

  {
    id: 'lv3-shoulder-neck-90s',
    label: '肩＋首ストレッチ 90秒',
    level: 3,
    kind: 'stretch',
    seconds: 90,
    description:
      '肩をゆっくり回してほぐします。\nそのあと首を左右に傾けて\n気持ちいい範囲で伸ばします。',
  },

  {
    id: 'lv3-forward-fold-60s',
    label: '前屈ストレッチ 1分',
    level: 3,
    kind: 'stretch',
    seconds: 60,
    description:
      'ひざを無理に伸ばし切らず、\n上体をゆっくり前へ倒します。\n痛みのない範囲でキープします。',
  },

  {
    id: 'lv3-side-stretch-30each',
    label: '体側伸ばし 左右30秒',
    level: 3,
    kind: 'stretch',
    seconds: 60,
    description:
      '片手を頭の上へ伸ばし、\n体をゆっくり横へ倒します。\nわき腹を伸ばして反対側も行います。',
  },

  {
    id: 'lv3-hamstring-30each',
    label: '太もも裏ストレッチ 左右30秒',
    level: 3,
    kind: 'stretch',
    seconds: 60,
    description:
      '片足を前に出します。\n背中を丸めすぎないようにしながら\n上体をゆっくり前へ倒します。',
  },

  {
    id: 'lv3-calf-stretch-30each',
    label: 'ふくらはぎ伸ばし 左右30秒',
    level: 3,
    kind: 'stretch',
    seconds: 60,
    description:
      '片足を後ろに引きます。\n後ろ足のかかとを床につけたまま\n体を前へ移動させます。',
  },

  {
    id: 'lv3-hip-stretch-30each',
    label: '股関節ストレッチ 左右30秒',
    level: 3,
    kind: 'stretch',
    seconds: 60,
    description:
      '片足を前に出してひざを曲げます。\n反対の足を後ろへ引き、\n股関節の前側をゆっくり伸ばします。',
  },

  {
    id: 'lv3-chest-shoulder-60s',
    label: '胸＋肩ストレッチ 1分',
    level: 3,
    kind: 'stretch',
    seconds: 60,
    description:
      '両手を背中側で組むか、\n無理のない範囲で後ろへ引きます。\n胸と肩の前側をゆっくり伸ばします。',
  },

  {
    id: 'lv3-full-body-stretch-90s',
    label: '全身を大きく伸ばす 90秒',
    level: 3,
    kind: 'stretch',
    seconds: 90,
    description:
      '両手を上へ大きく伸ばします。\n背中、体側、脚を順番に\n気持ちいい範囲で伸ばします。',
  },

  // --- mind (Lv3) ---

  {
    id: 'lv3-success-three',
    label: '今日できたことを3つ思い出す',
    level: 3,
    kind: 'mind',
    seconds: 90,
    description:
      '大きなことでなくて大丈夫です。\n今日できたことを\n3つ順番に思い出します。',
  },

  {
    id: 'lv3-gratitude-three',
    label: '感謝できることを3つ考える',
    level: 3,
    kind: 'mind',
    seconds: 90,
    description:
      '人、物、出来事など何でも大丈夫です。\n感謝できることを3つ考えます。',
  },

  {
    id: 'lv3-feeling-reason',
    label: '今の感情と理由を1つ考える',
    level: 3,
    kind: 'mind',
    seconds: 90,
    description:
      '今どんな気分なのかを一言で表します。\n次に、なぜそう感じているのかを\n1つだけ考えます。',
  },

  {
    id: 'lv3-most-important-one',
    label: '今日一番大事なことを1つ決める',
    level: 3,
    kind: 'mind',
    seconds: 60,
    description:
      'やること全部ではなく、\n今日これだけは大切と思うことを\n1つだけ決めます。',
  },

  {
    id: 'lv3-breath-focus-120s',
    label: '呼吸だけに意識を向ける 2分',
    level: 3,
    kind: 'mind',
    seconds: 120,
    description:
      '自然に呼吸します。\n息が入る感覚と出ていく感覚に\n意識を向けます。\n雑念が出てもそのままで大丈夫です。',
  },

  {
    id: 'lv3-observe-thoughts-120s',
    label: '浮かぶ考えを観察する 2分',
    level: 3,
    kind: 'mind',
    seconds: 120,
    description:
      '目を閉じます。\n何か考えが浮かんでも止めようとせず、\n「今こんなことを考えているな」と気づくだけで大丈夫です。',
  },

  {
    id: 'lv3-let-go-one',
    label: '今日やらなくていいことを1つ決める',
    level: 3,
    kind: 'mind',
    seconds: 60,
    description:
      '全部をやろうとせず、\n今日はやらなくてもいいことを\n1つだけ決めます。',
  },

  {
    id: 'lv3-self-praise-one',
    label: '自分を褒められることを1つ考える',
    level: 3,
    kind: 'mind',
    seconds: 60,
    description:
      '結果ではなくても大丈夫です。\n行動したことや続けたことなど、\n自分を褒められる点を1つ考えます。',
  },

  // --- rest (Lv3) ---

  {
    id: 'lv3-breath-120s',
    label: '2分間ゆっくり呼吸する\n（4秒吸って6秒吐く）',
    level: 3,
    kind: 'rest',
    seconds: 120,
  },

  {
    id: 'lv3-eyes-closed-120s',
    label: '目を閉じて2分何もしない',
    level: 3,
    kind: 'rest',
    seconds: 120,
  },

  {
    id: 'lv3-phone-away-3min',
    label: 'スマホを3分触らない',
    level: 3,
    kind: 'rest',
    seconds: 180,
  },

  {
    id: 'lv3-warm-eyes-90s',
    label: '目を手で覆って90秒休ませる',
    level: 3,
    kind: 'rest',
    seconds: 90,
    description:
      '目を閉じます。\nこすらずに手のひらで軽く覆います。\n力を抜いてそのまま休みます。',
  },

  {
    id: 'lv3-full-body-release-120s',
    label: '全身の力を抜いて2分休む',
    level: 3,
    kind: 'rest',
    seconds: 120,
    description:
      '楽な姿勢になります。\n肩、腕、脚、お腹の力を抜いて\n全身をゆるめます。',
  },

  {
    id: 'lv3-body-scan-120s',
    label: '体の感覚を順番に意識する\n（ボディスキャン2分）',
    level: 3,
    kind: 'rest',
    seconds: 120,
    description:
      '足から頭まで順番に意識します。\n温かさ、重さ、力みなどを\n変えようとせず感じます。',
  },

  {
    id: 'lv3-silence-120s',
    label: '音を止めて2分静かに過ごす',
    level: 3,
    kind: 'rest',
    seconds: 120,
  },

  {
    id: 'lv3-relax-three-points',
    label: '肩・あご・手の力を抜く 90秒',
    level: 3,
    kind: 'rest',
    seconds: 90,
    description:
      '肩を下げます。\n歯を食いしばらず、あごをゆるめます。\n最後に手の力を抜いて休みます。',
  },

  {
    id: 'lv3-look-far-60s',
    label: '遠くを眺めて目を休める 1分',
    level: 3,
    kind: 'rest',
    seconds: 60,
    description:
      'スマホや画面から目を離します。\nできるだけ遠くを\n力を入れずに眺めます。',
  },

  {
    id: 'lv3-chair-rest-120s',
    label: '椅子にもたれて2分休む',
    level: 3,
    kind: 'rest',
    seconds: 120,
    description:
      '椅子の背もたれに体を預けます。\n肩と腕の力を抜いて\n何もせず休みます。',
  },
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
