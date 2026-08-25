import {
  CHARACTER_BY_ID,
  CHARACTER_PACKS,
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacterById,
  getCharacterPackById,
  isCharacterId,
} from '@/src/data/characters';
import {
  configureRevenueCat,
  getCachedHasFamilyPack,
  refreshCustomerInfo,
  setRevenueCatAccessUpdateHandler,
} from '@/src/lib/revenueCat';
import { readJson, removeKey, writeJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type {
  Character,
  CharacterId,
  CharacterPack,
  CharacterPackId,
} from '@/src/types/character';

/**
 * DEV専用: ファミリーパック所有の強制上書き。
 * true = 購入済み扱い / false = 未購入扱い / null = overrideなし（RevenueCat判定を使用）
 * 本番ビルドでは常に null として扱い、保存もしない。
 */
export type DevFamilyPackOverride = boolean | null;

/**
 * 課金アクセス状態。
 * initialized=false のあいだは「未購入」ではなく「未確定」として扱う。
 */
export type PackAccessState = {
  initialized: boolean;
  hasFamilyPack: boolean;
};

let packAccessInitialized = false;
let packAccessInitPromise: Promise<void> | null = null;
let revenueCatHasFamilyPack = false;
let devFamilyPackOverride: DevFamilyPackOverride = null;
let packAccessVersion = 0;
const packAccessListeners = new Set<() => void>();

function notifyPackAccessChanged(): void {
  packAccessVersion += 1;
  for (const listener of packAccessListeners) {
    listener();
  }
}

function getRevenueCatHasFamilyPack(): boolean {
  return revenueCatHasFamilyPack;
}

/** 購入・復元成功後に CustomerInfo 由来の所有状態を反映する */
export function applyRevenueCatFamilyPackOwnership(hasFamilyPack: boolean): void {
  revenueCatHasFamilyPack = hasFamilyPack;
  if (packAccessInitialized) {
    notifyPackAccessChanged();
  }
}

setRevenueCatAccessUpdateHandler((hasFamilyPack) => {
  applyRevenueCatFamilyPackOwnership(hasFamilyPack);
});

/** 所有状態変更を購読（DEV override 変更時の即時再描画用） */
export function subscribePackAccess(listener: () => void): () => void {
  packAccessListeners.add(listener);
  return () => {
    packAccessListeners.delete(listener);
  };
}

export function getPackAccessVersion(): number {
  return packAccessVersion;
}

export function isPackAccessInitialized(): boolean {
  return packAccessInitialized;
}

export function getDevFamilyPackOverride(): DevFamilyPackOverride {
  if (!__DEV__) return null;
  return devFamilyPackOverride;
}

function normalizeDevOverride(value: unknown): DevFamilyPackOverride {
  if (value === true || value === false) return value;
  return null;
}

/**
 * 課金状態を初期化する。
 * 完了前は「未購入」とみなさない。多重呼び出しは同じ Promise を共有する。
 *
 * 順序:
 * 1. RevenueCat configure
 * 2. CustomerInfo 取得
 * 3. DEV override 読込
 * 4. initialized = true
 */
export async function initializePackAccess(): Promise<void> {
  if (packAccessInitialized) return;

  if (!packAccessInitPromise) {
    packAccessInitPromise = (async () => {
      await configureRevenueCat();
      await refreshCustomerInfo();
      revenueCatHasFamilyPack = getCachedHasFamilyPack();

      if (__DEV__) {
        const raw = await readJson<unknown>(
          STORAGE_KEYS.devFamilyPackOverride,
          null
        );
        devFamilyPackOverride = normalizeDevOverride(raw);
      } else {
        devFamilyPackOverride = null;
      }

      packAccessInitialized = true;
      notifyPackAccessChanged();
    })();
  }

  await packAccessInitPromise;
}

/** @deprecated initializePackAccess を使う。互換のため残す */
export async function loadDevFamilyPackOverride(): Promise<DevFamilyPackOverride> {
  await initializePackAccess();
  return getDevFamilyPackOverride();
}

/**
 * DEV専用 override を保存する。
 * RevenueCat / App Store の購入状態は変更しない。
 */
export async function setDevFamilyPackOverride(
  value: DevFamilyPackOverride
): Promise<void> {
  if (!__DEV__) return;

  // 判定を安全に使えるよう、未初期化なら先に完了させる
  await initializePackAccess();

  const next = normalizeDevOverride(value);
  devFamilyPackOverride = next;

  if (next === null) {
    await removeKey(STORAGE_KEYS.devFamilyPackOverride);
  } else {
    await writeJson(STORAGE_KEYS.devFamilyPackOverride, next);
  }

  notifyPackAccessChanged();
}

/** 最終的なファミリーパック利用可否（DEV override 優先 → なければ RevenueCat） */
export function hasFamilyPackAccess(): boolean {
  if (__DEV__ && devFamilyPackOverride !== null) {
    return devFamilyPackOverride;
  }

  return getRevenueCatHasFamilyPack();
}

export function getPackAccessState(): PackAccessState {
  return {
    initialized: packAccessInitialized,
    // 未初期化時の hasFamilyPack は意味を持たない（fallback判定には使わない）
    hasFamilyPack: packAccessInitialized ? hasFamilyPackAccess() : false,
  };
}

export function isPackOwned(packId: CharacterPackId): boolean {
  // free は常に所有
  if (packId === 'free') return true;
  if (packId === 'family_pack') {
    // 未初期化を「未購入」と表示しないよう、初期化前は所有扱いしないUI用。
    // キャラフォールバックは ensureOwnedCharacterId 側で初期化完了まで行わない。
    if (!packAccessInitialized) return false;
    return hasFamilyPackAccess();
  }
  return false;
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

/**
 * 未所有・不正IDは無料デフォルトへフォールバック。
 * 課金状態の初期化完了前は、所有判定によるフォールバックを行わない
 *（保存済み Family Pack キャラをギャルへ潰さない）。
 */
export function ensureOwnedCharacterId(characterId: unknown): CharacterId {
  if (!isCharacterId(characterId)) return DEFAULT_CHARACTER_ID;

  // 未初期化 = 未確定。未購入とみなして fallback しない
  if (!packAccessInitialized) {
    return characterId;
  }

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
