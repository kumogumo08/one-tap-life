import { getCharacterById } from '@/src/data/characters';
import type { CharacterId, PraiseStyleId } from '@/src/types/character';

import { GAL_PRAISES_LV1 } from './gal';
import { GRANDMA_PRAISES_LV1 } from './grandma';
import { KANSAI_OBACHAN_PRAISES_LV1 } from './kansai_obachan';
import { MOM_PRAISES_LV1 } from './mom';
import { SERIOUS_PRAISES_LV1 } from './serious';
import { TSUNDERE_SISTER_PRAISES_LV1 } from './tsundere_sister';

const PRAISES_BY_STYLE: Record<PraiseStyleId, readonly string[]> = {
  gal: GAL_PRAISES_LV1,
  serious: SERIOUS_PRAISES_LV1,
  mom: MOM_PRAISES_LV1,
  grandma: GRANDMA_PRAISES_LV1,
  tsundere_sister: TSUNDERE_SISTER_PRAISES_LV1,
  kansai_obachan: KANSAI_OBACHAN_PRAISES_LV1,
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

export {
  GAL_PRAISES_LV1,
  SERIOUS_PRAISES_LV1,
  MOM_PRAISES_LV1,
  GRANDMA_PRAISES_LV1,
  TSUNDERE_SISTER_PRAISES_LV1,
  KANSAI_OBACHAN_PRAISES_LV1,
};
