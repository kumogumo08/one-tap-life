import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { CHARACTERS, DEFAULT_CHARACTER_ID } from '@/src/data/characters';
import {
  ensureOwnedCharacterId,
  isCharacterOwned,
} from '@/src/lib/characterAccess';
import {
  defaultPremiumState,
  getTrialActive,
  loadPremiumState,
  PremiumState,
} from '@/src/lib/premium';
import { readJson, removeKey, writeJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type { CharacterId } from '@/src/types/character';
import type { TaskLevel } from '@/src/types/storage';
import {
  AVAILABLE_TASK_LEVELS,
  normalizeAvailableLevel,
  normalizeUserSettings,
  toSavableUserSettings,
} from '@/src/types/storage';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<CharacterId>(DEFAULT_CHARACTER_ID);
  const [level, setLevel] = useState<TaskLevel>(1);

  const saveLevel = async (lv: TaskLevel) => {
    // 公開版では AVAILABLE のみ保存・表示（将来配列に 2,3 を足せば解放）
    if (!AVAILABLE_TASK_LEVELS.includes(lv)) return;

    setLevel(lv); // UI先
    const current = normalizeUserSettings(
      await readJson<unknown>(STORAGE_KEYS.settings, null)
    );
    const next = toSavableUserSettings({
      selectedCharacterId: current.selectedCharacterId,
      level: lv,
    });
    await writeJson(STORAGE_KEYS.settings, next);
  };

  const onPressLevel1 = async () => {
    await saveLevel(1);
  };

  const onPressLevel2 = async () => {
    if (!AVAILABLE_TASK_LEVELS.includes(2)) return;

    const p = await loadPremiumState();
    const trialActive = getTrialActive(p);
  
    if (p.isPremium || trialActive) {
      await saveLevel(2);
      return;
    }
  
    // 未開始 or 体験終了 → PremiumPageへ
    router.push({
      pathname: '/premium',
      params: { from: 'level2' },
    });
  };
  
  const onPressLevel3 = async () => {
    if (!AVAILABLE_TASK_LEVELS.includes(3)) return;

    const p = await loadPremiumState();
  
    if (p.isPremium) {
      await saveLevel(3);
      return;
    }
  
    // Lv3は体験不可（方針固定）
    router.push({
      pathname: '/premium',
      params: { from: 'level3' },
    });
  };
  
  // プレミアム状態（表示用にも使える）
  const [premiumState, setPremiumState] = useState<PremiumState>(defaultPremiumState);
  
  const loadPremium = async () => {
    const p = await loadPremiumState();
    setPremiumState(p);
  };

  const load = async () => {
    try {
      const rawSettings = await readJson<unknown>(STORAGE_KEYS.settings, null);
      const settings = normalizeUserSettings(rawSettings);
      setSelectedCharacterId(ensureOwnedCharacterId(settings.selectedCharacterId));
      // UI上の選択表示は公開ゲート後のレベルに合わせる
      setLevel(normalizeAvailableLevel(settings.level));
    } catch {
      setSelectedCharacterId(DEFAULT_CHARACTER_ID);
      setLevel(1);
    }
  
    // ✅ finallyじゃなく、try/catchの外で await
    await loadPremium();
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await load();
      })();
    }, [])
  );

  const saveCharacter = async (characterId: CharacterId) => {
    if (!isCharacterOwned(characterId)) {
      Alert.alert(
        'プレミアムキャラクター',
        'このキャラクターは応援ファミリーパックに含まれています。購入機能は今後追加予定です。'
      );
      return;
    }

    setSelectedCharacterId(characterId); // 先に反映

    const current = normalizeUserSettings(
      await readJson<unknown>(STORAGE_KEYS.settings, null)
    );
    const next = toSavableUserSettings({
      selectedCharacterId: characterId,
      level: current.level,
    });
    await writeJson(STORAGE_KEYS.settings, next);
  };
  
  const levelRow = (lv: TaskLevel, subtitle: string) => {
    const isActive = level === lv;
  
    // ✅ 公開版で未解放のレベルは準備中
    const comingSoon = !AVAILABLE_TASK_LEVELS.includes(lv);
  
    const onPress =
      lv === 1 ? onPressLevel1 :
      lv === 2 ? onPressLevel2 :
      onPressLevel3;
  
    return (
      <Pressable
        key={lv}
        disabled={comingSoon}
        onPress={comingSoon ? undefined : onPress}
        android_disableSound
        accessibilityRole="button"
        accessibilityState={{ disabled: comingSoon }}
        style={[styles.levelCard, { borderColor: theme.tint }, isActive && styles.levelCardActive]}
      >
        <View style={styles.levelTopRow}>
          <ThemedText style={styles.levelIcon}>
            {isActive ? '●' : comingSoon ? '🔒' : '○'}
          </ThemedText>
  
          <ThemedText style={styles.levelTitle}>
            {lv === 1 ? 'Lv1（標準）' : lv === 2 ? 'Lv2' : 'Lv3'}
          </ThemedText>
        </View>
  
        {/* ✅ subtitle は表示上そのまま受け取るが、comingSoonなら「準備中」に固定 */}
        <ThemedText style={styles.levelSub}>
          {comingSoon ? '準備中' : subtitle}
        </ThemedText>
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
            await load(); // load() は最後に loadPremium() も呼ぶので表示も更新される
          } catch {
            // 本番ログ不要
          }
        },
      },
    ]);
  };
  
  const resetAllDebug = async () => {
    if (!__DEV__) return;
  
    Alert.alert('確認', '今日＋プレミアムをリセットしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([STORAGE_KEYS.daily, STORAGE_KEYS.premium]);
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

          {levelRow(1, '今日1つ＋追加3回まで')}
          {levelRow(2, '回数制限なし・もっとやりたい日に')}
          {levelRow(3, '習慣化を本気で続けたい人向け')}
        </View>

        <Pressable
          disabled
          onPress={undefined}
          android_disableSound
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          style={[styles.levelCard, { borderColor: theme.tint }]}
        >
          <View style={styles.levelTopRow}>
            <ThemedText style={styles.levelIcon}>★</ThemedText>
            <ThemedText style={styles.levelTitle}>プレミアム</ThemedText>
          </View>
          <ThemedText style={styles.levelSub}>準備中</ThemedText>
        </Pressable>

        {/* ===== 褒めてくれるキャラクター ===== */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>褒めてくれるキャラクター</ThemedText>

          {CHARACTERS.map((character) => {
            const owned = isCharacterOwned(character.id);
            const isActive = selectedCharacterId === character.id;

            return (
              <Pressable
                key={character.id}
                onPress={() => saveCharacter(character.id)}
                style={[styles.choiceBtn, isActive && styles.choiceBtnActive]}
              >
                <View style={styles.characterRow}>
                  <Image source={character.image} style={styles.characterThumb} />
                  <View style={styles.characterTextCol}>
                    <ThemedText style={styles.choiceText}>
                      {isActive ? '● ' : '○ '}
                      {character.name}
                      {!owned ? ' 🔒' : ''}
                    </ThemedText>
                    {!owned && (
                      <ThemedText style={styles.premiumHint}>プレミアム</ThemedText>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}

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

          <ThemedText style={styles.note}>
            Version 1.0.0
          </ThemedText>
        </View>

     {/* ===== デバッグ ===== */}
     {__DEV__ && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>デバッグ</ThemedText>

          <Pressable onPress={resetToday}>
            <ThemedText>（デバッグ）今日をリセット</ThemedText>
          </Pressable>

          <Pressable onPress={resetPremium}>
            <ThemedText>（デバッグ）プレミアム状態をリセット</ThemedText>
          </Pressable>

          <Pressable onPress={resetAllDebug}>
            <ThemedText>（デバッグ）全部リセット（今日＋プレミアム）</ThemedText>
          </Pressable>

          <ThemedText>
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
  },
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  characterThumb: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  characterTextCol: {
    flex: 1,
    gap: 2,
  },
  premiumHint: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 18,
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

});
