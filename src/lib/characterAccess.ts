import {
  CHARACTER_BY_ID,
  CHARACTER_PACKS,
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacterById,
  getCharacterPackById,
  isCharacterId,
} from '@/src/data/characters';
import type {
  Character,
  CharacterId,
  CharacterPack,
  CharacterPackId,
} from '@/src/types/character';

/**
 * 開発ビルド / Expo Go でのみファミリーパックを仮所有する。
 * 実機確認終了後、またはロックUI確認時は false にする。
 * リリースビルドでは __DEV__ が false のため、このフラグに関係なく無効。
 */
const ENABLE_DEV_FAMILY_PACK = true;

/**
 * Phase 1A の仮所有パック。
 * 課金SDK導入時はここだけを RevenueCat 連動の所有状態へ差し替える。
 */
const OWNED_PACK_IDS: readonly CharacterPackId[] =
  __DEV__ && ENABLE_DEV_FAMILY_PACK ? ['free', 'family_pack'] : ['free'];

export function isPackOwned(packId: CharacterPackId): boolean {
  // free は常に所有（OWNED_PACK_IDS 参照漏れでも壊れないようにする）
  if (packId === 'free') return true;
  return OWNED_PACK_IDS.includes(packId);
}

export function isCharacterOwned(characterId: CharacterId): boolean {
  const character = CHARACTER_BY_ID[characterId];
  if (!character) return false;
  // 無料キャラは常に利用可能（gal / serious）
  if (!character.isPremium) return true;
  return isPackOwned(character.packId);
}

/** 選択可能なキャラクター（無料 + 購入済みパック） */
export function getAvailableCharacters(): readonly Character[] {
  return CHARACTERS.filter((c) => isCharacterOwned(c.id));
}

/** getAvailableCharacters のエイリアス */
export function getOwnedCharacters(): readonly Character[] {
  return getAvailableCharacters();
}

/** ショップ表示用：free 以外のパック（所有/未所有どちらも含む） */
export function getShopPacks(): readonly CharacterPack[] {
  return CHARACTER_PACKS.filter((p) => p.id !== 'free');
}

export function getOwnedPacks(): readonly CharacterPack[] {
  return getShopPacks().filter((p) => isPackOwned(p.id));
}

export function getUnownedPacks(): readonly CharacterPack[] {
  return getShopPacks().filter((p) => !isPackOwned(p.id));
}

export function getPackCharacters(packId: CharacterPackId): readonly Character[] {
  const pack = getPackById(packId);
  if (!pack) return [];
  return pack.characterIds.map((id) => getCharacterById(id));
}

export function getPackCharacterNames(packId: CharacterPackId): string {
  return getPackCharacters(packId)
    .map((c) => c.name)
    .join('・');
}

/** 未所有・不正IDは無料デフォルトへフォールバック */
export function ensureOwnedCharacterId(characterId: unknown): CharacterId {
  if (!isCharacterId(characterId)) return DEFAULT_CHARACTER_ID;
  if (!isCharacterOwned(characterId)) return DEFAULT_CHARACTER_ID;
  return characterId;
}

export function getPackById(packId: CharacterPackId): CharacterPack | undefined {
  return getCharacterPackById(packId);
}

/** 未購入でも表示するショップ用パック（getShopPacks のエイリアス） */
export function getPurchasablePacks(): readonly CharacterPack[] {
  return getShopPacks();
}

export function getCharacterDisplay(characterId: CharacterId): Character {
  return getCharacterById(ensureOwnedCharacterId(characterId));
}
