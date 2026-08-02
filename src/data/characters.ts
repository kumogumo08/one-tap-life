import type {
  Character,
  CharacterId,
  CharacterPack,
  CharacterPackId,
} from '@/src/types/character';
import { CHARACTER_IDS } from '@/src/types/character';

export const DEFAULT_CHARACTER_ID: CharacterId = 'gal';

export const CHARACTERS: readonly Character[] = [
  {
    id: 'gal',
    name: 'ギャル',
    packId: 'free',
    isPremium: false,
    image: require('../../assets/images/praise/gal_v1.png'),
    praiseStyleId: 'gal',
    description: '元気に褒めてくれる無料キャラクター',
  },
  {
    id: 'serious',
    name: '真面目',
    packId: 'free',
    isPremium: false,
    image: require('../../assets/images/praise/serious_v1.png'),
    praiseStyleId: 'serious',
    description: '落ち着いて褒めてくれる無料キャラクター',
  },
  {
    id: 'mom',
    name: 'ママ',
    packId: 'family_pack',
    isPremium: true,
    image: require('../../assets/images/praise/mom.png'),
    praiseStyleId: 'serious',
    description: '応援ファミリーパックのキャラクター',
  },
  {
    id: 'grandma',
    name: 'おばあちゃん',
    packId: 'family_pack',
    isPremium: true,
    image: require('../../assets/images/praise/grandma.png'),
    praiseStyleId: 'serious',
    description: '応援ファミリーパックのキャラクター',
  },
  {
    id: 'tsundere_sister',
    name: 'ツンデレお姉さん',
    packId: 'family_pack',
    isPremium: true,
    image: require('../../assets/images/praise/tsundere_sister.png'),
    praiseStyleId: 'gal',
    description: '応援ファミリーパックのキャラクター',
  },
  {
    id: 'kansai_obachan',
    name: '関西のおばちゃん',
    packId: 'family_pack',
    isPremium: true,
    image: require('../../assets/images/praise/kansai_obachan.png'),
    praiseStyleId: 'gal',
    description: '応援ファミリーパックのキャラクター',
  },
] as const;

export const CHARACTER_PACKS: readonly CharacterPack[] = [
  {
    id: 'free',
    name: '無料キャラクター',
    description: 'はじめから使えるキャラクター',
    characterIds: ['gal', 'serious'],
    isPremium: false,
  },
  {
    id: 'family_pack',
    name: '応援ファミリーパック',
    description: '家族や身近な人たちに褒めてもらえるパック',
    characterIds: ['mom', 'grandma', 'tsundere_sister', 'kansai_obachan'],
    isPremium: true,
  },
] as const;

export const CHARACTER_BY_ID: Record<CharacterId, Character> = CHARACTERS.reduce(
  (acc, character) => {
    acc[character.id] = character;
    return acc;
  },
  {} as Record<CharacterId, Character>
);

export const FREE_CHARACTER_IDS: readonly CharacterId[] = CHARACTERS.filter(
  (c) => !c.isPremium
).map((c) => c.id);

export const PREMIUM_CHARACTER_IDS: readonly CharacterId[] = CHARACTERS.filter(
  (c) => c.isPremium
).map((c) => c.id);

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && (CHARACTER_IDS as readonly string[]).includes(value);
}

export function getCharacterById(id: CharacterId): Character {
  return CHARACTER_BY_ID[id] ?? CHARACTER_BY_ID[DEFAULT_CHARACTER_ID];
}

export function isCharacterPackId(value: unknown): value is CharacterPackId {
  return value === 'free' || value === 'family_pack';
}
