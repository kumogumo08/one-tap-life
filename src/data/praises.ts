import { getCharacterById } from '@/src/data/characters';
import type { CharacterId, PraiseStyleId } from '@/src/types/character';

export const GAL_PRAISES_LV1 = [
  'えらくない？今の、ちゃんとやってたよ。',
  'それできたの、普通にすごいよ。',
  '今日の自分、わりと悪くないじゃん。',
  'とりあえず動いたの、偉すぎだと思う。',
  'マジで自分磨き頑張ってるの、えらいと思う。',
  'それ続けたら、普通に強くなるやつ。',
  '今日もちゃんとやれてるよ。',
  '無理してないのが、一番えらいって。',
  '今のペース、ちょうどいい感じ。',
  'よし、今日はこれでOKだね。',

  '今の一歩、ちゃんと意味あるから。',
  'それ選べた時点で、だいぶ良いよ。',
  '今日はそれだけで十分だと思う。',
  'ちゃんと自分のこと考えてる感じする。',
  'マジうちらの健康寿命延びたわ。',
  '少しでも動けたの、普通に評価高い。',
  'それやれた自分、ちゃんと見てあげよ。',
  '今日はこれ以上求めなくていい日。',
  '今の感じ、無理なくて良いと思う。',
  'その一歩が明日の自分を作る系じゃん。',

  'ちゃんと今の自分に合ってたよ。',
  'それでOK出せるの、強いよ。',
  '今日もちゃんと前に進んでる。',
  'そのくらいが一番続くやつ。',
  '今の調子、悪くないどころか良い。',
  '今日はこれで花丸でしょ。',
  'マジでリスペクトなんだけど！',
  'マジで自分大事にしてて尊い……。',
  '今日は無理しない判断が正解。',
  'うん、今の自分にちょうどいい。',
] as const;

export const SERIOUS_PRAISES_LV1 = [
  '今日もきちんと行動できました。',
  '小さくても、前に進めています。',
  'やると決めたことを実行できました。',
  '無理せず、良い選択です。',
  '継続は力になります。',
  '今日の判断は正解です。',
  '落ち着いて進められています。',
  '今のペースで問題ありません。',
  '行動できたこと自体が成果です。',
  '今日も十分やれています。',
  'ちゃんと自分を動かせました。',
  '今日の一歩は、確実に積み重なります。',
  '無理のない継続ができています。',
  '自分との約束を守れました。',
  '今のやり方で続けましょう。',
  '今日の選択は、未来につながります。',
  '淡々と進めているのが良いです。',
  '余計なことを考えず、行動できました。',
  '今の状態は安定しています。',
  'この調子で大丈夫です。',
] as const;

const PRAISES_BY_STYLE: Record<PraiseStyleId, readonly string[]> = {
  gal: GAL_PRAISES_LV1,
  serious: SERIOUS_PRAISES_LV1,
};

const FALLBACK_PRAISE = 'よくやりました。';

export function getPraisesForStyle(styleId: PraiseStyleId): readonly string[] {
  return PRAISES_BY_STYLE[styleId] ?? PRAISES_BY_STYLE.gal;
}

/** キャラクター定義の praiseStyleId 経由で褒め言葉を取得（画面側で gal/serious 判定しない） */
export function getPraisesForCharacter(characterId: CharacterId): readonly string[] {
  const character = getCharacterById(characterId);
  return getPraisesForStyle(character.praiseStyleId);
}

export function getRandomPraiseForCharacter(characterId: CharacterId): string {
  const source = getPraisesForCharacter(characterId);

  if (!Array.isArray(source) || source.length === 0) {
    return FALLBACK_PRAISE;
  }

  return source[Math.floor(Math.random() * source.length)];
}
