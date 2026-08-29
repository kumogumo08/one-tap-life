import type { CharacterId } from '@/src/types/character';

export const DEFAULT_NOTIFICATION_MESSAGE = '今日も1つだけ、やっておきませんか。';

/**
 * キャラクター別の通知文。
 * 新しい CharacterId が増えたら、ここに配列を足すだけで対応できる。
 * 未登録のキャラは DEFAULT_NOTIFICATION_MESSAGE にフォールバックする。
 */
export const NOTIFICATION_MESSAGES_BY_CHARACTER: Partial<
  Record<CharacterId, readonly string[]>
> = {
  gal: [
    '今日まだじゃん！1個だけやっとこ〜',
    '今日も軽くやっとこ〜',
    '今日のタップ、残ってるよ〜',
  ],
  serious: [
    '1つだけ、今日の行動を積み重ねましょう。',
    '小さな継続が、確かな変化につながります。',
    '1日の終わりに、小さな達成を。',
  ],
  mom: [
    '今日まだやってないでしょ？1個だけやっときなさい。',
    '忘れる前に今日の分やっちゃいなさい。',
    'ほらほら、1個終わらせちゃいなさい。',
  ],
  grandma: [
    '無理せんでいいから、少しだけやりなさいな。',
    '今日もひとつ進めたら立派だよぉ。',
    'おばぁちゃん、見てるからね～。',
  ],
  tsundere_sister: [
    'ちょっと、今日の分まだ終わってないじゃない。',
    '忘れてたとか言わせないんだから。',
    'べ、別に待ってたわけじゃないけど…今日まだでしょ。',
  ],
  kansai_obachan: [
    'あんた今日まだやってへんやろ！1個やっとき！',
    'ほらほら、今日もチャチャッとやっとき！',
    'まだやってへんの？しゃあないなぁ、はよやり！',
  ],
};

export function pickNotificationMessage(
  messages: readonly string[] | undefined | null
): string {
  if (!Array.isArray(messages) || messages.length === 0) {
    return DEFAULT_NOTIFICATION_MESSAGE;
  }

  const picked = messages[Math.floor(Math.random() * messages.length)];
  return picked ?? DEFAULT_NOTIFICATION_MESSAGE;
}

export function getNotificationMessage(characterId: CharacterId): string {
  return pickNotificationMessage(NOTIFICATION_MESSAGES_BY_CHARACTER[characterId]);
}
