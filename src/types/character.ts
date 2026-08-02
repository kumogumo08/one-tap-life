import type { ImageSourcePropType } from 'react-native';

/** 既存褒め言葉セットへの参照キー（本文差し替え前の暫定ブリッジ） */
export const PRAISE_STYLE_IDS = ['gal', 'serious'] as const;
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
  /** 既存褒め言葉データへの参照。将来はキャラ別配列へ差し替え可能 */
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
