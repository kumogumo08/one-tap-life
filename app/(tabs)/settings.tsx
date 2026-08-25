import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import {
  DEFAULT_CHARACTER_ID,
  getCharacterById,
  isCharacterId,
} from '@/src/data/characters';
import {
  applyRevenueCatFamilyPackOwnership,
  ensureOwnedCharacterId,
  getDevFamilyPackOverride,
  getPackAccessState,
  initializePackAccess,
  setDevFamilyPackOverride,
  type DevFamilyPackOverride,
} from '@/src/lib/characterAccess';
import { restoreFamilyPackPurchases } from '@/src/lib/revenueCat';
import {
  defaultPremiumState,
  getTrialActive,
  loadPremiumState,
  PremiumState,
} from '@/src/lib/premium';
import {
  ensureUserProgress,
  getAvailableTaskLevels,
  getLevelUnlockProgress,
  isLevelUnlocked,
} from '@/src/lib/progress';
import { readJson, removeKey, writeJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type { CharacterId } from '@/src/types/character';
import { DEFAULT_USER_PROGRESS, type UserProgress } from '@/src/types/progress';
import type { TaskLevel } from '@/src/types/storage';
import {
  normalizeAvailableLevel,
  normalizeUserSettings,
  toSavableUserSettings,
} from '@/src/types/storage';
import { router } from 'expo-router';

function formatDevFamilyPackOverride(value: DevFamilyPackOverride): string {
  if (value === true) return '購入済み（強制）';
  if (value === false) return '未購入（強制）';
  return '実購入状態を使用';
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<CharacterId>(DEFAULT_CHARACTER_ID);
  const [level, setLevel] = useState<TaskLevel>(1);
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_USER_PROGRESS);
  const [devFamilyPackOverride, setDevFamilyPackOverrideState] =
    useState<DevFamilyPackOverride>(null);
  const currentCharacter = getCharacterById(
    ensureOwnedCharacterId(selectedCharacterId)
  );

  const saveLevel = async (lv: TaskLevel) => {
    const currentProgress = await ensureUserProgress();
    setProgress(currentProgress);
    if (!isLevelUnlocked(lv, currentProgress)) return;

    setLevel(lv);
    const current = normalizeUserSettings(
      await readJson<unknown>(STORAGE_KEYS.settings, null)
    );
    const next = toSavableUserSettings({
      selectedCharacterId: current.selectedCharacterId,
      level: lv,
    });
    await writeJson(STORAGE_KEYS.settings, next);
  };
  
  // プレミアム状態（表示用にも使える）
  const [premiumState, setPremiumState] = useState<PremiumState>(defaultPremiumState);
  
  const loadPremium = async () => {
    const p = await loadPremiumState();
    setPremiumState(p);
  };

  const syncSelectedCharacterAfterAccessChange = async () => {
    // 初期化完了後にのみ所有判定で fallback する
    await initializePackAccess();

    const raw = await readJson<unknown>(STORAGE_KEYS.settings, null);
    const current = normalizeUserSettings(raw);

    // normalize 済みIDではなく、保存されている生IDを基準にする
    // （normalize 内 fallback との二重変換で書き込み判定が消えるのを防ぐ）
    const storedId =
      raw &&
      typeof raw === 'object' &&
      isCharacterId((raw as { selectedCharacterId?: unknown }).selectedCharacterId)
        ? (raw as { selectedCharacterId: CharacterId }).selectedCharacterId
        : current.selectedCharacterId;

    const safeId = ensureOwnedCharacterId(storedId);
    setSelectedCharacterId(safeId);

    if (safeId !== storedId) {
      await writeJson(
        STORAGE_KEYS.settings,
        toSavableUserSettings({
          selectedCharacterId: safeId,
          level: current.level,
        })
      );
    }
  };

  const applyDevFamilyPackOverride = async (value: DevFamilyPackOverride) => {
    if (!__DEV__) return;
    await setDevFamilyPackOverride(value);
    setDevFamilyPackOverrideState(getDevFamilyPackOverride());
    await syncSelectedCharacterAfterAccessChange();
  };

  const load = async () => {
    try {
      await initializePackAccess();
      if (__DEV__) {
        setDevFamilyPackOverrideState(getDevFamilyPackOverride());
      }
    } catch {}

    try {
      const currentProgress = await ensureUserProgress();
      setProgress(currentProgress);
      const rawSettings = await readJson<unknown>(STORAGE_KEYS.settings, null);
      const settings = normalizeUserSettings(rawSettings);
      setSelectedCharacterId(ensureOwnedCharacterId(settings.selectedCharacterId));
      setLevel(
        normalizeAvailableLevel(
          settings.level,
          getAvailableTaskLevels(currentProgress)
        )
      );
    } catch {
      setSelectedCharacterId(DEFAULT_CHARACTER_ID);
      setLevel(1);
    }
  
    if (__DEV__) {
      await loadPremium();
    }
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await load();
      })();
    }, [])
  );

  const openCharacterSelect = () => {
    // /characters/index は [packId]="index" に誤マッチするため使わない
    router.push('/characters');
  };

  const levelRow = (lv: TaskLevel) => {
    const isActive = level === lv;
    const unlocked = isLevelUnlocked(lv, progress);
    const locked = !unlocked;
    const unlock =
      lv === 1 ? null : getLevelUnlockProgress(lv, progress);

    const title =
      lv === 1 ? 'Lv1（軽め）' : lv === 2 ? 'Lv2（標準）' : 'Lv3（本格）';

    const subtitle = unlocked
      ? lv === 1
        ? '今日1つ＋追加3回まで'
        : lv === 2
          ? '続けて体を動かしたい日に'
          : '習慣化を本気で続けたい人向け'
      : unlock
        ? `${unlock.requiredDays}日経過 ＋ ${unlock.requiredCompletions}回達成で解放`
        : '';

    return (
      <Pressable
        key={lv}
        disabled={locked}
        onPress={locked ? undefined : () => void saveLevel(lv)}
        android_disableSound
        accessibilityRole="button"
        accessibilityState={{ disabled: locked }}
        style={[styles.levelCard, { borderColor: theme.tint }, isActive && styles.levelCardActive]}
      >
        <View style={styles.levelTopRow}>
          <ThemedText style={styles.levelIcon}>
            {isActive ? '●' : locked ? '🔒' : '○'}
          </ThemedText>

          <ThemedText style={styles.levelTitle}>{title}</ThemedText>
        </View>

        <ThemedText style={styles.levelSub}>{subtitle}</ThemedText>
        {locked && unlock ? (
          <ThemedText style={styles.levelSub}>
            {unlock.elapsedDays} / {unlock.requiredDays}日 ・ {unlock.completedCount} / {unlock.requiredCompletions}回
          </ThemedText>
        ) : null}
      </Pressable>
    );
  };
  

  const resetToday = async () => {
    if (!__DEV__) return;
  
    Alert.alert('確認', '今日の状態をリセットしますか？（履歴は消えません）', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeKey(STORAGE_KEYS.daily);
        
            // 設定画面の表示も更新（任意）
            await load();
        
            // ✅ Homeへ戻して useFocusEffect を確実に発火させる
            router.replace('/(tabs)');
        
            // もしくは Home を明示したいなら:
            // router.replace('/(tabs)/index');
        
          } catch {
            Alert.alert('エラー', 'リセットに失敗しました');
          }
        },
      },
    ]);
  };
  
  const resetPremium = async () => {
    if (!__DEV__) return;
  
    Alert.alert('確認', 'プレミアム状態をリセットしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeKey(STORAGE_KEYS.premium);
            await load(); // __DEV__ では loadPremium() も呼ぶので表示も更新される
          } catch {
            // 本番ログ不要
          }
        },
      },
    ]);
  };
  
  const resetAllDebug = async () => {
    if (!__DEV__) return;
  
    Alert.alert(
      '確認',
      '今日・プレミアム・ファミリーパックDEV設定をリセットしますか？',
      [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              STORAGE_KEYS.daily,
              STORAGE_KEYS.premium,
              STORAGE_KEYS.devFamilyPackOverride,
            ]);
            await setDevFamilyPackOverride(null);
            await load();
            router.replace('/(tabs)');
          } catch {
            Alert.alert('エラー', 'リセットに失敗しました');
          }
        },
      },
    ]);
  };

  const openPrivacy = async () => {
    try {
      await Linking.openURL('https://procom.jp/one-tap-life/privacy');
    } catch {
      Alert.alert('エラー', 'ブラウザを開けませんでした');
    }
  };
  
  const openSupport = async () => {
    try {
      await Linking.openURL('https://procom.jp/one-tap-life/support');
    } catch {
      Alert.alert('エラー', 'ブラウザを開けませんでした');
    }
  };

  const restorePurchases = async () => {
    const result = await restoreFamilyPackPurchases();

    if (result.status === 'unavailable' || result.status === 'error') {
      Alert.alert('復元できませんでした', result.message);
      return;
    }

    applyRevenueCatFamilyPackOwnership(result.hasFamilyPack);
    await syncSelectedCharacterAfterAccessChange();

    if (result.hasFamilyPack) {
      Alert.alert('復元完了', 'ファミリーパックの購入を復元しました。');
    } else {
      Alert.alert('復元結果', '復元できる購入が見つかりませんでした。');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title">設定</ThemedText>

        {/* ===== レベル ===== */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>レベル</ThemedText>

          {levelRow(1)}
          {levelRow(2)}
          {levelRow(3)}
        </View>

        {/* ===== 褒めてくれるキャラクター ===== */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>褒めてくれるキャラクター</ThemedText>

          <View style={styles.currentCharacterCard}>
            <Image source={currentCharacter.image} style={styles.currentCharacterImage} />
            <ThemedText style={styles.currentCharacterName}>
              {currentCharacter.name}
            </ThemedText>
            <ThemedText style={styles.currentCharacterStatus}>現在選択中</ThemedText>
          </View>

          <Pressable
            onPress={openCharacterSelect}
            style={[styles.choiceBtn, { borderColor: theme.tint }]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.choiceText}>変更する</ThemedText>
          </Pressable>

          <ThemedText style={styles.note}>
            ※ 完了時のひとことが変わります
          </ThemedText>
        </View>

        {/* ===== アプリ情報 ===== */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>アプリ情報</ThemedText>

          <Pressable onPress={openPrivacy} style={styles.choiceBtn}>
            <ThemedText style={styles.choiceText}>
              プライバシーポリシー
            </ThemedText>
          </Pressable>

          <Pressable onPress={openSupport} style={styles.choiceBtn}>
            <ThemedText style={styles.choiceText}>
              サポート
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => void restorePurchases()}
            style={styles.choiceBtn}
            accessibilityRole="button"
          >
            <ThemedText style={styles.choiceText}>購入を復元</ThemedText>
          </Pressable>

          <ThemedText style={styles.note}>
            Version 1.0.0
          </ThemedText>
        </View>

     {/* ===== デバッグ ===== */}
     {__DEV__ && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>デバッグ</ThemedText>

          <ThemedText style={styles.debugStatus}>
            ファミリーパック override: {formatDevFamilyPackOverride(devFamilyPackOverride)}
          </ThemedText>
          <ThemedText style={styles.debugStatus}>
            判定結果:{' '}
            {(() => {
              const state = getPackAccessState();
              if (!state.initialized) return '初期化中';
              return state.hasFamilyPack ? '購入済み' : '未購入';
            })()}
          </ThemedText>

          <Pressable
            onPress={() => void applyDevFamilyPackOverride(true)}
            style={styles.debugBtn}
          >
            <ThemedText>ファミリーパック：購入済みにする</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => void applyDevFamilyPackOverride(false)}
            style={styles.debugBtn}
          >
            <ThemedText>ファミリーパック：未購入にする</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => void applyDevFamilyPackOverride(null)}
            style={styles.debugBtn}
          >
            <ThemedText>ファミリーパック：実購入状態を使用</ThemedText>
          </Pressable>

          <Pressable onPress={resetToday} style={styles.debugBtn}>
            <ThemedText>（デバッグ）今日をリセット</ThemedText>
          </Pressable>

          <Pressable onPress={resetPremium} style={styles.debugBtn}>
            <ThemedText>（デバッグ）プレミアム状態をリセット</ThemedText>
          </Pressable>

          <Pressable onPress={resetAllDebug} style={styles.debugBtn}>
            <ThemedText>（デバッグ）全部リセット（今日＋プレミアム＋FP）</ThemedText>
          </Pressable>

          <ThemedText style={styles.debugStatus}>
            premium: {premiumState.isPremium ? 'true' : 'false'} / trial:{' '}
            {getTrialActive(premiumState) ? 'active' : 'off'}
          </ThemedText>
        </View>
      )}
      </ScrollView>
    </ThemedView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },
  scrollContent: { paddingBottom: 24 },
 
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', opacity: 0.7, marginBottom: 10 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  safe: { flex: 1 },

  taskPreview: { opacity: 0.8, marginBottom: 12 },

  dangerBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dangerText: { fontWeight: '700' },

  note: { marginTop: 10, opacity: 0.6, fontSize: 12 },

  choiceBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  choiceBtnActive: {
    opacity: 1,
  },
  choiceText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  currentCharacterCard: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  currentCharacterImage: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
  },
  currentCharacterName: {
    fontWeight: '800',
    fontSize: 18,
  },
  currentCharacterStatus: {
    fontSize: 12,
    opacity: 0.65,
  },

  levelCard: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  levelCardActive: {
    opacity: 1,
  },
  levelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelIcon: {
    width: 26,
    fontWeight: '800',
  },
  levelTitle: {
    fontWeight: '800',
    fontSize: 14,
  },
  levelSub: {
    marginTop: 6,
    opacity: 0.7,
    fontSize: 12,
  },

  debugBtn: {
    marginTop: 10,
    paddingVertical: 10,
  },
  debugStatus: {
    marginTop: 6,
    opacity: 0.7,
    fontSize: 12,
  },

});
