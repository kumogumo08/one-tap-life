import {
  CHARACTER_BY_ID,
  CHARACTER_PACKS,
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacterById,
  isCharacterId,
} from '@/src/data/characters';
import type { Character, CharacterId, CharacterPackId } from '@/src/types/character';

/**
 * Phase 1A の仮所有パック。
 * 課金SDK導入時はここだけを RevenueCat 連動の所有状態へ差し替える。
 */
const OWNED_PACK_IDS = ['free'] as const satisfies readonly CharacterPackId[];

export function isPackOwned(packId: CharacterPackId): boolean {
  return (OWNED_PACK_IDS as readonly CharacterPackId[]).includes(packId);
}

export function isCharacterOwned(characterId: CharacterId): boolean {
  const character = CHARACTER_BY_ID[characterId];
  if (!character) return false;
  return isPackOwned(character.packId);
}

export function getAvailableCharacters(): readonly Character[] {
  return CHARACTERS.filter((c) => isCharacterOwned(c.id));
}

/** 未所有・不正IDは無料デフォルトへフォールバック */
export function ensureOwnedCharacterId(characterId: unknown): CharacterId {
  if (!isCharacterId(characterId)) return DEFAULT_CHARACTER_ID;
  if (!isCharacterOwned(characterId)) return DEFAULT_CHARACTER_ID;
  return characterId;
}

export function getPackById(packId: CharacterPackId) {
  return CHARACTER_PACKS.find((p) => p.id === packId);
}

export function getCharacterDisplay(characterId: CharacterId): Character {
  return getCharacterById(ensureOwnedCharacterId(characterId));
}
