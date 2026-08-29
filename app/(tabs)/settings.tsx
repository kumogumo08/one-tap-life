import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
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
import {
  applyNotificationSettings,
  enableDailyNotifications,
  loadNotificationSettings,
} from '@/src/lib/notifications';
import {
  NOTIFICATION_HOUR_PRESETS,
  formatNotificationTime,
} from '@/src/lib/notificationCore';
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
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from '@/src/types/notificationSettings';
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
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [notificationHelpVisible, setNotificationHelpVisible] = useState(false);
  const notificationBusyRef = useRef(false);
  const isDark = colorScheme === 'dark';
  const modalBackground = isDark ? '#1C1C1E' : '#F7FAFC';
  const modalText = isDark ? Colors.dark.text : '#5C7EA6';
  const modalOverlay = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)';
  const modalCardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'transparent';
  const modalCloseBg = isDark ? '#2C3136' : Colors.light.tint;
  const modalCloseBorder = isDark ? '#687076' : 'transparent';
  const modalCloseText = isDark ? Colors.dark.text : '#fff';

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

  const onToggleNotifications = async (enabled: boolean) => {
    if (notificationBusyRef.current) return;
    notificationBusyRef.current = true;
    try {
      if (enabled) {
        const result = await enableDailyNotifications();
        setNotificationSettings(result.settings);
        if (!result.granted) {
          Alert.alert(
            '通知が許可されていません',
            '後から端末の設定またはアプリの設定から変更できます。'
          );
        }
      } else {
        const next = await applyNotificationSettings({
          notificationsEnabled: false,
        });
        setNotificationSettings(next);
      }
    } catch {
      Alert.alert(
        '通知が許可されていません',
        '後から端末の設定またはアプリの設定から変更できます。'
      );
    } finally {
      notificationBusyRef.current = false;
    }
  };

  const onSelectNotificationHour = async (hour: number) => {
    if (notificationBusyRef.current) return;
    notificationBusyRef.current = true;
    try {
      const next = await applyNotificationSettings({
        notificationHour: hour,
        notificationMinute: 0,
      });
      setNotificationSettings(next);
    } finally {
      notificationBusyRef.current = false;
    }
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

    try {
      setNotificationSettings(await loadNotificationSettings());
    } catch {
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
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
            await removeKey(STORAGE_KEYS.extraSession);
        
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
              STORAGE_KEYS.extraSession,
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

        {/* ===== 通知 ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, styles.sectionTitleInHeader]}>
              通知
            </ThemedText>
            <Pressable
              onPress={() => setNotificationHelpVisible(true)}
              style={styles.helpLink}
              accessibilityRole="button"
              accessibilityLabel="この通知について"
            >
              <ThemedText style={styles.helpLinkText}>ⓘ この通知について</ThemedText>
            </Pressable>
          </View>

          <View style={styles.row}>
            <ThemedText style={styles.notificationLabel}>毎日のリマインダー</ThemedText>
            <Switch
              value={notificationSettings.notificationsEnabled}
              onValueChange={(enabled) => void onToggleNotifications(enabled)}
              trackColor={{ false: '#D0D5DD', true: theme.tint }}
              thumbColor="#fff"
              accessibilityRole="switch"
              accessibilityLabel="毎日のリマインダー"
            />
          </View>

          <ThemedText style={styles.note}>
            {formatNotificationTime(
              notificationSettings.notificationHour,
              notificationSettings.notificationMinute
            )}
            にお知らせします
          </ThemedText>

          <View style={styles.timeRow}>
            {NOTIFICATION_HOUR_PRESETS.map((hour) => {
              const selected =
                notificationSettings.notificationHour === hour &&
                notificationSettings.notificationMinute === 0;
              return (
                <Pressable
                  key={hour}
                  onPress={() => void onSelectNotificationHour(hour)}
                  style={[
                    styles.timeChip,
                    { borderColor: theme.tint },
                    selected && styles.timeChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <ThemedText style={styles.timeChipText}>
                    {formatNotificationTime(hour, 0)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
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

      <Modal
        visible={notificationHelpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationHelpVisible(false)}
      >
        <View style={styles.descModalRoot}>
          <Pressable
            style={[styles.descModalBackdrop, { backgroundColor: modalOverlay }]}
            onPress={() => setNotificationHelpVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="説明を閉じる"
          />
          <Pressable
            style={[
              styles.descModalCard,
              {
                backgroundColor: modalBackground,
                borderColor: modalCardBorder,
              },
            ]}
            onPress={() => {}}
          >
            <ThemedText style={[styles.descModalHeading, { color: modalText }]}>
              忘れていたら、お知らせします
            </ThemedText>
            <ScrollView
              style={styles.descModalScroll}
              contentContainerStyle={styles.descModalScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <ThemedText style={[styles.descText, { color: modalText }]}>
                その日のワンタップがまだ終わっていないときだけ、設定した時間に通知します。
              </ThemedText>
              <ThemedText style={[styles.descText, styles.descTextSpaced, { color: modalText }]}>
                朝や昼にすでに完了していれば、その日の通知は届きません。
              </ThemedText>
              <ThemedText style={[styles.descText, styles.descTextSpaced, { color: modalText }]}>
                『今日まだだった！』を防ぐための、やり忘れ防止リマインダーです。
              </ThemedText>
            </ScrollView>
            <Pressable
              onPress={() => setNotificationHelpVisible(false)}
              style={[
                styles.descModalCloseBtn,
                { backgroundColor: modalCloseBg, borderColor: modalCloseBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <ThemedText style={[styles.descModalCloseText, { color: modalCloseText }]}>
                閉じる
              </ThemedText>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    </ThemedView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },
  scrollContent: { paddingBottom: 24 },
 
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', opacity: 0.7, marginBottom: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitleInHeader: {
    marginBottom: 0,
  },
  helpLink: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  helpLinkText: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
  },
  descModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  descModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  descModalCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    zIndex: 1,
    elevation: 4,
  },
  descModalHeading: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  descModalScroll: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  descModalScrollContent: {
    paddingBottom: 8,
  },
  descModalCloseBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  descModalCloseText: {
    fontSize: 16,
    fontWeight: '700',
  },
  descText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
  },
  descTextSpaced: {
    marginTop: 12,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timeChipActive: {
    opacity: 1,
    borderWidth: 2,
  },
  timeChipText: {
    fontWeight: '700',
    fontSize: 13,
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
