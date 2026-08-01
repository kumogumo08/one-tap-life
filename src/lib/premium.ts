// src/lib/premium.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/src/lib/storageKeys';

export const PREMIUM_ENABLED = false; // ← 今回の公開では false のまま

/** @deprecated STORAGE_KEYS.premium を使う。互換のため残す */
export const PREMIUM_KEY = STORAGE_KEYS.premium;

export const TRIAL_DAYS = 7;
export const TRIAL_EXTRA_LIMIT_PER_DAY = 5;

export type PremiumState = {
  isPremium: boolean;

  // --- Trial (Lv2) ---
  trialStartedAt?: number; // ms
  trialEndsAt?: number;    // ms
  trialConsumed?: boolean; // 一度でも開始したら true（再トライアル防止）

  // トライアル中の「追加でもう1つやる」上限（1日あたり）
  trialExtraLimitPerDay?: number; // 例: 5
};

export const defaultPremiumState: PremiumState = {
  isPremium: false,
  trialStartedAt: undefined,
  trialEndsAt: undefined,
  trialConsumed: false,
  trialExtraLimitPerDay: TRIAL_EXTRA_LIMIT_PER_DAY,
};

export const loadPremiumState = async (): Promise<PremiumState> => {
  try {
    const raw = await AsyncStorage.getItem(PREMIUM_KEY);
    if (!raw) return defaultPremiumState;
    const parsed = JSON.parse(raw) as Partial<PremiumState>;
    return { ...defaultPremiumState, ...parsed };
  } catch {
    return defaultPremiumState;
  }
};

export const savePremiumState = async (next: PremiumState) => {
  await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(next));
};

export const getTrialActive = (p: PremiumState, now = Date.now()) => {
  if (!PREMIUM_ENABLED) return false; // ← 追加
  if (p.isPremium) return false;
  if (!p.trialEndsAt) return false;
  return now < p.trialEndsAt;
};

// 「残り日数」表示用（endsAt基準で統一）
export const getTrialDaysLeft = (p: PremiumState, now = Date.now()) => {
  if (!p.trialEndsAt) return 0;
  const ms = p.trialEndsAt - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

// 7日トライアル開始（1回だけ）
export const startLv2Trial = async (
  days = TRIAL_DAYS,
  extraLimitPerDay = TRIAL_EXTRA_LIMIT_PER_DAY
) => {
  // 🔒 今回の公開ではトライアル開始を無効化（状態を書き換えない）
  if (!PREMIUM_ENABLED) {
    return await loadPremiumState(); // 何も変えず現状を返す
  }

  const p = await loadPremiumState();

  if (p.isPremium) return p;
  if (getTrialActive(p) || p.trialConsumed) return p;

  const now = Date.now();
  const ends = now + days * 24 * 60 * 60 * 1000;

  const next: PremiumState = {
    ...p,
    trialStartedAt: now,
    trialEndsAt: ends,
    trialConsumed: true,
    trialExtraLimitPerDay: extraLimitPerDay,
  };

  await savePremiumState(next);
  return next;
};
