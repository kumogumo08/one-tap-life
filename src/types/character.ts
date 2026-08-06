import type { ImageSourcePropType } from 'react-native';

/** 褒め言葉セットへの参照キー（CharacterId とは別型。同一キャラで別口調を持てる余地を残す） */
export const PRAISE_STYLE_IDS = [
  'gal',
  'serious',
  'mom',
  'grandma',
  'tsundere_sister',
  'kansai_obachan',
] as const;
export type PraiseStyleId = (typeof PRAISE_STYLE_IDS)[number];

export const CHARACTER_IDS = [
  'gal',
  'serious',
  'mom',
  'grandma',
  'tsundere_sister',
  'kansai_obachan',
] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export const CHARACTER_PACK_IDS = ['free', 'family_pack'] as const;
export type CharacterPackId = (typeof CHARACTER_PACK_IDS)[number];

export type Character = {
  id: CharacterId;
  name: string;
  packId: CharacterPackId;
  isPremium: boolean;
  image: ImageSourcePropType;
  /** 褒め言葉セットへの参照。キャラ別配列への差し替えが可能 */
  praiseStyleId: PraiseStyleId;
  description?: string;
};

export type CharacterPack = {
  id: CharacterPackId;
  name: string;
  description: string;
  characterIds: readonly CharacterId[];
  isPremium: boolean;
};
