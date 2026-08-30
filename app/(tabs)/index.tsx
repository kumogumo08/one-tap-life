import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DEFAULT_CHARACTER_ID } from '@/src/data/characters';
import { getRandomPraiseForCharacter } from '@/src/data/praises';
import { getDescriptionByLabel } from '@/src/data/tasks';
import {
  ensureOwnedCharacterId,
  initializePackAccess,
} from '@/src/lib/characterAccess';
import { dateKeyLocal } from '@/src/lib/dateKey';
import type { ExtraSession } from '@/src/lib/extraSession';
import { normalizeExtraSession } from '@/src/lib/extraSession';
import {
  canRecordExtraCompletion,
  canRecordMainCompletion,
  extraCompletionKey,
} from '@/src/lib/homeRestore';
import {
  canCompleteHome,
  canShowExtraHome,
  DEFAULT_HOME_EXTRA_LIMIT,
  displayedPraise,
  displayedTaskLabel,
  resolveHomeState,
  type HomeState,
} from '@/src/lib/homeState';
import {
  applyNotificationSettings,
  enableDailyNotifications,
  loadNotificationSettings,
} from '@/src/lib/notifications';
import {
  isFirstTaskCompletion,
  shouldShowNotificationPrompt,
} from '@/src/lib/notificationCore';
import { pickTask } from '@/src/lib/pickTask';
import { appendRecentTaskId, normalizeRecentTaskIds } from '@/src/lib/recentTaskIds';
import {
  defaultPremiumState,
  getTrialActive,
  loadPremiumState,
  PremiumState,
} from '@/src/lib/premium';
import { ensureUserProgress, getAvailableTaskLevels, recordTaskCompletion } from '@/src/lib/progress';
import { readJson, removeKey, writeJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type { CharacterId } from '@/src/types/character';
import { DEFAULT_USER_PROGRESS } from '@/src/types/progress';
import type { DailyState, HistoryItem, TaskLevel } from '@/src/types/storage';
import {
  DEFAULT_DAILY_STATE,
  normalizeAvailableLevel,
  normalizeDailyState,
  normalizeHistoryList,
  normalizeUserSettings,
} from '@/src/types/storage';
import {
  ZenMaruGothic_400Regular,
  ZenMaruGothic_700Bold,
} from '@expo-google-fonts/zen-maru-gothic';
import { useFonts } from 'expo-font';
import NotificationPromptModal from '@/components/NotificationPromptModal';
import PraiseCharacter from '@/components/PraiseCharacter';

type ScreenWrapperProps = React.PropsWithChildren;

function ScreenWrapper({ children }: ScreenWrapperProps) {
  return (
    <ImageBackground
      source={require('../../assets/images/bg-gradient.png')}
      resizeMode="cover"
      style={screenWrapperStyles.container}
    >
      <View pointerEvents="none" style={screenWrapperStyles.overlay} />
      {children}
    </ImageBackground>
  );
}

const screenWrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});

/** タスク出現アニメだけ。ドメイン状態は HomeState.status */
type AnimationPhase = 'idle' | 'animating' | 'settled';

type Origin = { x: number; y: number };

type CrackerBurstProps = {
  tick: number;
  origin?: Origin | null;
  tint: string;
  count?: number;
  palette?: string[];
};

// ===== 色・定数 =====
const RAINBOW = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
];

const addHistory = async (
  taskText: string,
  taskId: string | null | undefined,
  isExtra = false,
  ts: number
): Promise<boolean> => {
  const item: HistoryItem = {
    id: `${ts}_${Math.random().toString(16).slice(2)}`,
    task: taskText,
    ts,
    isExtra,
  };
  if (typeof taskId === 'string' && taskId.length > 0) {
    item.taskId = taskId;
  }

  try {
    const prev = normalizeHistoryList(
      await readJson<unknown>(STORAGE_KEYS.history, [])
    );
    const next = [item, ...prev].slice(0, 500);
    return await writeJson(STORAGE_KEYS.history, next);
  } catch {
    return false;
  }
};

export default function HomeScreen() {
  // Hooksは必ず先頭で固定順に
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const homeTint = Colors.light.tint;
  // 説明Modalのみダーク対応。ホーム本体の色味はライト固定
  const modalBackground = isDark ? '#1C1C1E' : '#F7FAFC';
  const modalText = isDark ? Colors.dark.text : '#5C7EA6';
  const modalOverlay = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)';
  const modalCardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'transparent';
  const modalCloseBg = isDark ? '#2C3136' : Colors.light.tint;
  const modalCloseBorder = isDark ? '#687076' : 'transparent';
  const modalCloseText = isDark ? Colors.dark.text : '#fff';

  // ✅ まず state（pickTask が daily を参照するため）
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [homeState, setHomeState] = useState<HomeState>(() => ({
    status: 'idle',
    dateKey: dateKeyLocal(new Date()),
  }));

  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const [typed, setTyped] = useState<string>('');
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<CharacterId>(DEFAULT_CHARACTER_ID);
  const [level, setLevel] = useState<TaskLevel>(1);
  const [progress, setProgress] = useState(DEFAULT_USER_PROGRESS);
  const [ready, setReady] = useState(false);
  const [praiseTick, setPraiseTick] = useState(0);
  const [descModalVisible, setDescModalVisible] = useState(false);

  const [premiumState, setPremiumState] = useState<PremiumState>(defaultPremiumState);

  const opRef = useRef(false);
  const homeRestoreGenRef = useRef(0);
  const dailyRef = useRef<DailyState | null>(null);
  const lastFinishedExtraKeyRef = useRef<string | null>(null);
  const extraSessionRef = useRef<ExtraSession | null>(null);
  const applyResolvedHomeStateRef = useRef<
    (state: HomeState, nextDaily?: DailyState) => void
  >(() => {});
  const skipTaskTypingRef = useRef(false);
  const skipPraiseTypingRef = useRef(false);

  // 公開版ゲート済みレベルで抽選（保存上の level と食い違わないようにする）
  const availableLevels = getAvailableTaskLevels(progress);
  const activeLevel = normalizeAvailableLevel(level, availableLevels);

  // --- 以下、あなたの既存コード続き ---
  const btnOpacity = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const taskOpacity = useRef(new Animated.Value(0)).current;
  const taskY = useRef(new Animated.Value(8)).current;

  const [praise, setPraise] = useState('');
  const [typedPraise, setTypedPraise] = useState('');

  const completeBtnRef = useRef<View | null>(null);
  const [crackerTick, setCrackerTick] = useState(0);
  const [crackerOrigin, setCrackerOrigin] = useState<Origin | null>(null);
  const [notificationPromptPending, setNotificationPromptPending] = useState(false);
  const [notificationPromptVisible, setNotificationPromptVisible] = useState(false);
  const [notificationPromptBusy, setNotificationPromptBusy] = useState(false);
  const notificationPromptShownRef = useRef(false);
  const notificationPromptVisibleRef = useRef(false);

  // ✅ プレミアム完全ロック（この画面内でも保険）
  const PREMIUM_ENABLED = false;

  function getExtraLimit() {
    // 🔒 今回の公開ではプレミアム（trial含む）は完全ロック
    if (!PREMIUM_ENABLED) {
      return 3; // 無料版の仕様（Lv1上限）に固定
    }

    if (premiumState.isPremium) return Number.POSITIVE_INFINITY;

    if (level === 1) return 3;

    if (level === 2 && getTrialActive(premiumState)) {
      return premiumState.trialExtraLimitPerDay ?? 5;
    }

    return 0;
  }

  const extraLimit = getExtraLimit();
  const extraCount =
    homeState.status === 'idle'
      ? 0
      : homeState.status === 'main-active'
        ? 0
        : homeState.extraCount;
  const displayedTask = displayedTaskLabel(homeState);
  const canComplete = canCompleteHome(homeState);
  const canShowExtraButton = ready && canShowExtraHome(homeState);
  const canSubmitComplete = canComplete && displayedTask.length > 0;

  const triggerCracker = () => setCrackerTick(t => t + 1);

  const [fontsLoaded] = useFonts({
    ZenMaruGothic_400Regular,
    ZenMaruGothic_700Bold,
  });

  const applyResolvedHomeState = (state: HomeState, nextDaily?: DailyState) => {
    if (nextDaily) {
      setDaily(nextDaily);
      dailyRef.current = nextDaily;
    }
    setHomeState(state);
    setAnimationPhase(state.status === 'idle' ? 'idle' : 'settled');
    setDescModalVisible(false);
    const restoredTask = displayedTaskLabel(state);
    const restoredPraise = displayedPraise(state);
    skipTaskTypingRef.current =
      state.status === 'main-active' || state.status === 'extra-active';
    skipPraiseTypingRef.current =
      state.status === 'main-completed' || state.status === 'day-completed';
    setTyped(restoredTask);
    setPraise(restoredPraise);
    setTypedPraise(restoredPraise);
    if (state.status === 'idle') {
      skipTaskTypingRef.current = false;
      skipPraiseTypingRef.current = false;
      btnOpacity.setValue(1);
      btnScale.setValue(1);
      taskOpacity.setValue(0);
      taskY.setValue(8);
      return;
    }
    btnOpacity.setValue(0);
    btnScale.setValue(0.95);
    taskOpacity.setValue(1);
    taskY.setValue(0);
  };
  applyResolvedHomeStateRef.current = applyResolvedHomeState;

  // 今日状態を復元（通常起動 / 通知 / foreground とも同じ）
  useFocusEffect(
    useCallback(() => {
      const gen = ++homeRestoreGenRef.current;
      let alive = true;
      const isCurrent = () => alive && homeRestoreGenRef.current === gen;

      const run = async () => {
        if (!isCurrent()) return;
        setReady(false);

        try {
          await initializePackAccess();
          if (!isCurrent()) return;

          try {
            const currentProgress = await ensureUserProgress();
            if (!isCurrent()) return;
            setProgress(currentProgress);
            const available = getAvailableTaskLevels(currentProgress);

            const rawSettings = await readJson<unknown>(STORAGE_KEYS.settings, null);
            if (!isCurrent()) return;
            const settings = normalizeUserSettings(rawSettings);
            setSelectedCharacterId(ensureOwnedCharacterId(settings.selectedCharacterId));
            setLevel(normalizeAvailableLevel(settings.level, available));
          } catch {
            if (!isCurrent()) return;
            setProgress(DEFAULT_USER_PROGRESS);
            setLevel(1);
          }
          if (!isCurrent()) return;

          try {
            const p = await loadPremiumState();
            if (!isCurrent()) return;
            setPremiumState(p);
          } catch {
            if (!isCurrent()) return;
            setPremiumState(defaultPremiumState);
          }

          const todayKey = dateKeyLocal(new Date());
          const extraLimitNow = DEFAULT_HOME_EXTRA_LIMIT;
          const rawDaily = await readJson<unknown>(STORAGE_KEYS.daily, null);
          if (!isCurrent()) return;

          if (rawDaily == null) {
            const fresh = DEFAULT_DAILY_STATE(todayKey);
            await writeJson(STORAGE_KEYS.daily, fresh);
            await removeKey(STORAGE_KEYS.extraSession);
            extraSessionRef.current = null;
            lastFinishedExtraKeyRef.current = null;
            if (!isCurrent()) return;
            applyResolvedHomeStateRef.current(
              resolveHomeState(fresh, null, todayKey, extraLimitNow),
              fresh
            );
            return;
          }

          const saved = normalizeDailyState(rawDaily, todayKey);

          // recentTaskIds は日またぎ除外のためここでは消さない
          if (saved.dateKey !== todayKey) {
            const fresh = DEFAULT_DAILY_STATE(todayKey);
            await writeJson(STORAGE_KEYS.daily, fresh);
            await removeKey(STORAGE_KEYS.extraSession);
            extraSessionRef.current = null;
            lastFinishedExtraKeyRef.current = null;
            if (!isCurrent()) return;
            applyResolvedHomeStateRef.current(
              resolveHomeState(fresh, null, todayKey, extraLimitNow),
              fresh
            );
            return;
          }

          const rawExtraSession = await readJson<unknown>(STORAGE_KEYS.extraSession, null);
          if (!isCurrent()) return;
          let persistedExtra = normalizeExtraSession(rawExtraSession);
          if (persistedExtra && persistedExtra.dateKey !== todayKey) {
            await removeKey(STORAGE_KEYS.extraSession);
            persistedExtra = null;
          }
          extraSessionRef.current = persistedExtra;

          await writeJson(STORAGE_KEYS.daily, saved);
          if (!isCurrent()) return;
          applyResolvedHomeStateRef.current(
            resolveHomeState(saved, persistedExtra, todayKey, extraLimitNow),
            saved
          );
        } catch {
          // 本番ではログ出さない
        } finally {
          if (isCurrent()) setReady(true);
        }
      };

      run();

      return () => {
        alive = false;
      };
    }, [])
  );  

     const onExtraTap = async () => {
      if (homeState.status !== 'main-completed') return;
      if (!daily) return;

      const limit = getExtraLimit();
      const count = daily.extraCount ?? 0;
      if (count >= limit) return;

      lastFinishedExtraKeyRef.current = null;
      skipTaskTypingRef.current = false;
      skipPraiseTypingRef.current = false;
      taskOpacity.setValue(0);
      taskY.setValue(8);
      setAnimationPhase('animating');
      setTyped('');
      setDescModalVisible(false);
      setPraise('');
      setTypedPraise('');

      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

      const todayKey = dateKeyLocal(new Date());
      const recentTaskIds = normalizeRecentTaskIds(
        await readJson<unknown>(STORAGE_KEYS.recentTaskIds, null)
      );
      const picked = pickTask(activeLevel, daily.lastTaskId ?? null, recentTaskIds);

      const nextDaily: DailyState = { ...daily, lastTaskId: picked.id };
      const extraSession: ExtraSession = {
        dateKey: todayKey,
        taskId: picked.id,
        taskLabel: picked.label,
        completed: false,
      };
      extraSessionRef.current = extraSession;
      setDaily(nextDaily);
      dailyRef.current = nextDaily;
      setHomeState(resolveHomeState(nextDaily, extraSession, todayKey, extraLimit));

      Animated.parallel([
        Animated.timing(taskOpacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(taskY, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setAnimationPhase('settled');
      });

      await writeJson(
        STORAGE_KEYS.recentTaskIds,
        appendRecentTaskId(recentTaskIds, picked.id)
      );
      await writeJson(STORAGE_KEYS.extraSession, extraSession);
      await writeJson(STORAGE_KEYS.daily, nextDaily);
    }; 

    const onTap = async () => {
      if (!ready) return;
      if (homeState.status !== 'idle') return;

      opRef.current = true;
      skipTaskTypingRef.current = false;
      skipPraiseTypingRef.current = false;
      setAnimationPhase('animating');
      setTyped('');
      setTypedPraise('');
      setPraise('');
      setDescModalVisible(false);
      taskOpacity.setValue(0);
      taskY.setValue(8);

      const todayKey = dateKeyLocal(new Date());
      const baseDaily: DailyState = daily ?? DEFAULT_DAILY_STATE(todayKey);
      if (baseDaily.completed) return;

      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

      const recentTaskIds = baseDaily.task
        ? []
        : normalizeRecentTaskIds(
            await readJson<unknown>(STORAGE_KEYS.recentTaskIds, null)
          );
      const picked = baseDaily.task
        ? null
        : pickTask(activeLevel, baseDaily.lastTaskId ?? null, recentTaskIds);
      const todayTask = baseDaily.task || picked?.label || '水をコップ1杯飲む';

      const nextDaily: DailyState = {
        ...baseDaily,
        dateKey: todayKey,
        task: todayTask,
        completed: false,
        lastTaskId: baseDaily.task ? (baseDaily.lastTaskId ?? null) : (picked?.id ?? null),
        taskLevel: baseDaily.task ? (baseDaily.taskLevel ?? activeLevel) : activeLevel,
      };

      setDaily(nextDaily);
      dailyRef.current = nextDaily;
      setHomeState(resolveHomeState(nextDaily, null, todayKey, extraLimit));

      if (picked) {
        await writeJson(
          STORAGE_KEYS.recentTaskIds,
          appendRecentTaskId(recentTaskIds, picked.id)
        );
      }
      await writeJson(STORAGE_KEYS.daily, nextDaily);

      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(btnScale,   { toValue: 0.95, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(taskOpacity,{ toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(taskY,      { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setAnimationPhase('settled');
      });
    };

    useEffect(() => {
      dailyRef.current = daily;
    }, [daily]);

    useEffect(() => {
      setDescModalVisible(false);
    }, [displayedTask]);

    const closeDescModal = useCallback(() => {
      setDescModalVisible(false);
    }, []);

    const openDescModal = useCallback(() => {
      setDescModalVisible(true);
    }, []);

    const onComplete = async () => {
      if (!canSubmitComplete || !displayedTask) return;

      const completingExtra = homeState.status === 'extra-active';
      if (completingExtra) {
        const currentKey = extraCompletionKey(displayedTask, daily?.lastTaskId);
        if (
          !canRecordExtraCompletion({
            extraInProgress: true,
            lastFinishedKey: lastFinishedExtraKeyRef.current,
            currentKey,
          })
        ) {
          return;
        }
      } else if (homeState.status !== 'main-active') {
        return;
      } else if (!canRecordMainCompletion(daily?.completed === true)) {
        return;
      }

      // 完了ボタンが消える前に原点を測って演出を発火する
      const btn = completeBtnRef.current as { measureInWindow?: Function } | null;
      if (btn?.measureInWindow) {
        btn.measureInWindow((x: number, y: number, w: number, h: number) => {
          setCrackerOrigin({ x: x + w / 2, y: y + h / 2 });
          triggerCracker();
        });
      } else {
        setCrackerOrigin(null);
        triggerCracker();
      }

      if (completingExtra) {
        lastFinishedExtraKeyRef.current = extraCompletionKey(
          displayedTask,
          daily?.lastTaskId
        );
      }

      opRef.current = true;
      setDescModalVisible(false);
    
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

      const todayKey = dateKeyLocal(new Date());
      const msg = getRandomPraiseForCharacter(selectedCharacterId);
      let nextDaily: DailyState;
      let nextExtra: ExtraSession | null = extraSessionRef.current;

      // 完了フラグは履歴より先に保存する。褒め言葉も同じ DailyState に残す。
      if (!completingExtra) {
        nextDaily = {
          ...(daily ?? DEFAULT_DAILY_STATE(todayKey)),
          dateKey: todayKey,
          task: displayedTask,
          completed: true,
          completedTs: Date.now(),
          extraCount: daily?.extraCount ?? 0,
          lastTaskId: daily?.lastTaskId ?? null,
          taskLevel: daily?.taskLevel ?? activeLevel,
          praise: msg,
        };
        nextExtra = extraSessionRef.current;
        dailyRef.current = nextDaily;
        setDaily(nextDaily);
        await writeJson(STORAGE_KEYS.daily, nextDaily);
      } else {
        const extraSession: ExtraSession = {
          dateKey: todayKey,
          taskId: extraSessionRef.current?.taskId || daily?.lastTaskId || '',
          taskLabel: displayedTask,
          completed: true,
        };
        extraSessionRef.current = extraSession;
        nextExtra = extraSession;
        await writeJson(STORAGE_KEYS.extraSession, extraSession);

        nextDaily = {
          ...(daily ?? {
            ...DEFAULT_DAILY_STATE(todayKey),
            completed: true,
          }),
          completed: true,
          extraCount: (daily?.extraCount ?? 0) + 1,
          lastTaskId: daily?.lastTaskId ?? null,
          praise: msg,
        };
        dailyRef.current = nextDaily;
        setDaily(nextDaily);
        await writeJson(STORAGE_KEYS.daily, nextDaily);
      }

      const nextState = resolveHomeState(nextDaily, nextExtra, todayKey, extraLimit);
      skipTaskTypingRef.current = false;
      skipPraiseTypingRef.current = false;
      setHomeState(nextState);
      setTyped(displayedTaskLabel(nextState));
      setAnimationPhase('settled');
    
      // 履歴に保存（ここが唯一の addHistory）。成功時のみ進捗を加算する
      const completedTs = Date.now();
      const historySaved = await addHistory(
        displayedTask,
        daily?.lastTaskId,
        completingExtra,
        completedTs
      );
      if (historySaved) {
        try {
          await recordTaskCompletion(completedTs);
        } catch {}
      }
    
      if (completingExtra) {
        opRef.current = false;
      }
    
      // ✅ 褒めタイピング：同じ文言でも必ず再生されるようにする
      setTypedPraise('');
      setPraise(msg);
      setPraiseTick(t => t + 1);

      // 完了本処理の後に後付け。保存・演出を待たせない
      if (
        shouldShowNotificationPrompt({
          notificationPromptShown: notificationPromptShownRef.current,
          isFirstCompletion: isFirstTaskCompletion(progress),
        })
      ) {
        notificationPromptShownRef.current = true;
        setNotificationPromptPending(true);
        void applyNotificationSettings({ notificationPromptShown: true });
      }
    };    

// タイプ演出（未完了タスク表示のたびにリセットして開始）
useEffect(() => {
  if (
    homeState.status !== 'main-active' &&
    homeState.status !== 'extra-active'
  ) {
    return;
  }
  if (!displayedTask) return;
  if (skipTaskTypingRef.current) {
    skipTaskTypingRef.current = false;
    setTyped(displayedTask);
    return;
  }

  setTyped('');

  let i = 0;

  const raf = requestAnimationFrame(() => {
    const id = setInterval(() => {
      i += 1;
      setTyped(displayedTask.slice(0, i));
      if (i >= displayedTask.length) clearInterval(id);
    }, 110);

    (cleanup as any).id = id;
  });

  function cleanup() {
    cancelAnimationFrame(raf);
    const id = (cleanup as any).id as ReturnType<typeof setInterval> | undefined;
    if (id) clearInterval(id);
  }

  return cleanup;
}, [homeState.status, displayedTask]);


// 完了後の褒めメッセージをタイピング表示（praise が変わるたび確実にリセット）
useEffect(() => {
  if (!praise) return;
  if (skipPraiseTypingRef.current) {
    skipPraiseTypingRef.current = false;
    setTypedPraise(praise);
    return;
  }

  setTypedPraise('');
  let i = 0;

  const id = setInterval(() => {
    i += 1;
    setTypedPraise(praise.slice(0, i));
    if (i >= praise.length) clearInterval(id);
  }, 70);

  return () => clearInterval(id);
}, [praise, praiseTick]);

useEffect(() => {
  void loadNotificationSettings().then((settings) => {
    if (settings.notificationPromptShown) {
      notificationPromptShownRef.current = true;
    }
  });
}, []);

useEffect(() => {
  if (!notificationPromptPending) return;
  if (notificationPromptVisibleRef.current) return;
  if (!praise || typedPraise !== praise) return;

  const timer = setTimeout(() => {
    if (notificationPromptVisibleRef.current) return;
    notificationPromptVisibleRef.current = true;
    setNotificationPromptPending(false);
    setNotificationPromptVisible(true);
  }, 700);

  return () => clearTimeout(timer);
}, [notificationPromptPending, praise, typedPraise]);

const closeNotificationPrompt = useCallback(() => {
  notificationPromptVisibleRef.current = false;
  setNotificationPromptVisible(false);
  setNotificationPromptPending(false);
  setNotificationPromptBusy(false);
}, []);

const skipNotificationPrompt = useCallback(() => {
  if (notificationPromptBusy) return;
  notificationPromptShownRef.current = true;
  closeNotificationPrompt();
}, [closeNotificationPrompt, notificationPromptBusy]);

const enableNotificationPrompt = useCallback(async () => {
  if (notificationPromptBusy) return;
  setNotificationPromptBusy(true);
  notificationPromptShownRef.current = true;
  try {
    const result = await enableDailyNotifications({
      notificationHour: 20,
      notificationMinute: 0,
    });
    if (!result.granted) {
      Alert.alert(
        '通知が許可されていません',
        '後から端末の設定またはアプリの設定から変更できます。'
      );
    }
  } catch {
    Alert.alert(
      '通知が許可されていません',
      '後から端末の設定またはアプリの設定から変更できます。'
    );
  } finally {
    closeNotificationPrompt();
  }
}, [closeNotificationPrompt, notificationPromptBusy]);

const currentDesc = getDescriptionByLabel(displayedTask);

if (!fontsLoaded) {
  return null;
}

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
        <CrackerBurst
          tick={crackerTick}
          origin={crackerOrigin}
          tint={homeTint}
          palette={RAINBOW}
          count={50}
        />
  
          <View style={styles.header}>
            <ThemedText type="title" style={[styles.title, styles.textOutline]}>
              ワンタップライフ
            </ThemedText>
          </View>
  
          <View style={styles.centerArea}>
            <View style={styles.stage}>
              <ThemedText style={[styles.catchText, styles.baseText, styles.textOutline]}>
                今日は1つだけでいい
              </ThemedText>

              {homeState.status === 'idle' && (
                <Animated.View
                  style={[
                    styles.overlayCenter,
                    { opacity: btnOpacity, transform: [{ scale: btnScale }] },
                  ]}
                >
                  <Pressable
                    disabled={!ready}
                    onPress={onTap}
                    style={[
                      styles.circleButton,
                      { borderColor: homeTint },
                      !ready && { opacity: 0.4 },
                    ]}
                  >
                    <IconSymbol size={38} name="hand.tap.fill" color={homeTint} />
                    <ThemedText type="defaultSemiBold" style={[styles.circleText, styles.textOutline]}>
                      ワンタップ
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              )}
                {/* ✅ タスク表示。完了後も文言は残し、完了ボタンだけ出さない */}
                {homeState.status !== 'idle' && displayedTask ? (
                  <Animated.View
                    style={[
                      styles.overlayCenter,
                      { opacity: taskOpacity, transform: [{ translateY: taskY }] },
                    ]}
                  >
                    {/* 元の中央寄せから、キャッチとの間だけ 20〜40px 上へ */}
                    <View style={[styles.taskStack, { transform: [{ translateY: -64 }] }]}>
                      <View style={styles.taskLabelArea}>
                        <View style={styles.taskRow}>
                          <View style={styles.taskLabelWrap}>
                            <ThemedText
                              style={[
                                styles.taskLabel,
                                styles.baseText,
                                styles.textOutline,
                                styles.taskLabelText,
                              ]}
                            >
                              今日のタスク
                            </ThemedText>

                            <View style={styles.doubleUnderlineAbsolute}>
                              <View style={styles.underlinePrimary} />
                              <View style={styles.underlineSecondary} />
                            </View>
                          </View>

                          {!!currentDesc && (
                            <Pressable
                              onPress={openDescModal}
                              style={styles.infoBtn}
                              accessibilityRole="button"
                              accessibilityLabel="タスクの説明を表示"
                            >
                              <ThemedText style={[styles.infoText, styles.textOutline]}>ⓘ</ThemedText>
                            </Pressable>
                          )}
                        </View>
                      </View>

                      <ThemedText style={[styles.taskText, styles.semiBold, styles.textOutline]}>
                        {typed}
                      </ThemedText>

                      {canSubmitComplete && (
                        <Pressable
                          ref={completeBtnRef as any}
                          onPress={onComplete}
                          style={[
                            styles.completeBtn,
                            { borderColor: homeTint, backgroundColor: homeTint },
                          ]}
                        >
                          <ThemedText style={[styles.completeText, styles.semiBold]}>
                            完了！
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  </Animated.View>
                ) : null}

              {canShowExtraButton && (
                <Pressable onPress={onExtraTap} style={styles.extraBtn}>
                  <ThemedText style={[styles.extraText, styles.textOutline]}>
                    ＋ もう1つやる
                    {Number.isFinite(extraLimit)
                      ? `（残り${Math.max(0, extraLimit - extraCount)}）`
                      : ''}
                  </ThemedText>
                </Pressable>
              )}

              {/* ✅ 画面下にキャラ＋吹き出し（背景上に重ねる） */}
              {!!typedPraise &&
                (homeState.status === 'main-completed' ||
                  homeState.status === 'day-completed') && (
                <View style={styles.praiseOverlay} pointerEvents="none">
                  <PraiseCharacter characterId={selectedCharacterId} message={typedPraise} />
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={descModalVisible && !!currentDesc}
        transparent
        animationType="fade"
        onRequestClose={closeDescModal}
      >
        <View style={styles.descModalRoot}>
          <Pressable
            style={[styles.descModalBackdrop, { backgroundColor: modalOverlay }]}
            onPress={closeDescModal}
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
            <ThemedText style={[styles.descModalHeading, styles.semiBold, { color: modalText }]}>
              タスクの説明
            </ThemedText>
            <ThemedText style={[styles.descModalTaskLabel, styles.semiBold, { color: modalText }]}>
              {displayedTask}
            </ThemedText>
            <ScrollView
              style={styles.descModalScroll}
              contentContainerStyle={styles.descModalScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <ThemedText style={[styles.descText, { color: modalText }]}>
                {currentDesc}
              </ThemedText>
            </ScrollView>
            <Pressable
              onPress={closeDescModal}
              style={[
                styles.descModalCloseBtn,
                { backgroundColor: modalCloseBg, borderColor: modalCloseBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <ThemedText style={[styles.descModalCloseText, styles.semiBold, { color: modalCloseText }]}>
                閉じる
              </ThemedText>
            </Pressable>
          </Pressable>
        </View>
      </Modal>

      <NotificationPromptModal
        visible={notificationPromptVisible}
        busy={notificationPromptBusy}
        onEnable={() => void enableNotificationPrompt()}
        onSkip={skipNotificationPrompt}
      />
    </ScreenWrapper>
  );
}

export function CrackerBurst({
  tick,
  origin,
  tint,
  count = 100,
  palette,
}: CrackerBurstProps) {
  const [visible, setVisible] = useState(false);

  // 端末負荷を考慮して最大120個
  const COUNT = Math.min(120, Math.max(10, count));

  // 粒子ごとのアニメーション値
  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        r: new Animated.Value(0),
        sway: new Animated.Value(0),
        flutter: new Animated.Value(0),
        o: new Animated.Value(0),
        s: new Animated.Value(1),
      })),
    [COUNT]
  );

  // 粒子の色
  const colors = useMemo(() => {
    const selectedPalette =
      palette && palette.length > 0 ? palette : RAINBOW;

    return Array.from(
      { length: COUNT },
      (_, index) => selectedPalette[index % selectedPalette.length]
    );
  }, [COUNT, palette]);

  useEffect(() => {
    if (!tick) return;

    setVisible(true);

    const animations = particles.map((particle) => {
      // 前回のアニメーション状態をリセット
      particle.x.setValue(0);
      particle.y.setValue(0);
      particle.r.setValue(0);
      particle.sway.setValue(0);
      particle.flutter.setValue(0);
      particle.o.setValue(0);
      particle.s.setValue(1);

      // 上方向を中心に扇状に発射
      const angle =
        (-130 + Math.random() * 80) * (Math.PI / 180);

      const speed = 280 + Math.random() * 220;
      const wind = (Math.random() - 0.5) * 100;

      const dx = Math.cos(angle) * speed + wind;
      const initialDy = Math.sin(angle) * speed * 0.80;

      // 下方向に落ちる距離
      const fallDistance = 260 + Math.random() * 180;

      // ほぼ同時に発射
      const delay = Math.floor(Math.random() * 35);

      // 上昇・落下時間
      const riseDuration = 150 + Math.random() * 80;
      const fallDuration = 1500 + Math.random() * 900;
      const totalDuration = riseDuration + fallDuration;

      // 平面回転は2〜5回転程度
      const rotationDirection = Math.random() > 0.5 ? 1 : -1;
      const rotation =
        rotationDirection * (720 + Math.random() * 1080);

      // ひらひらする速度
      const flutterDuration = 220 + Math.random() * 180;

      // 左右に揺れる距離
      const swayDistance = 4 + Math.random() * 7;

      // アニメーション全体をカバーする回数
      const flutterIterations = Math.ceil(
        totalDuration / (flutterDuration * 2)
      );

      return Animated.sequence([
        Animated.delay(delay),

        Animated.parallel([
          // 表示
          Animated.timing(particle.o, {
            toValue: 1,
            duration: 40,
            useNativeDriver: true,
          }),

          // 横方向へ広がる
          Animated.sequence([
            // 発射直後に一気に広がる
            Animated.timing(particle.x, {
              toValue: dx * 0.62,
              duration: riseDuration,
              easing: Easing.out(Easing.exp),
              useNativeDriver: true,
            }),

            // その後は惰性で少し移動
            Animated.timing(particle.x, {
              toValue: dx,
              duration: fallDuration,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),

            // 上昇後に落下
            Animated.sequence([
              Animated.timing(particle.y, {
                toValue: initialDy,
                duration: riseDuration,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),

              Animated.timing(particle.y, {
                toValue: initialDy + fallDistance,
                duration: fallDuration,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
            ]),

          // 平面上の回転
          Animated.timing(particle.r, {
            toValue: rotation,
            duration: totalDuration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),

          // 左右にゆらゆら揺れる
          Animated.loop(
            Animated.sequence([
              Animated.timing(particle.sway, {
                toValue: swayDistance,
                duration: flutterDuration,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),

              Animated.timing(particle.sway, {
                toValue: -swayDistance,
                duration: flutterDuration * 1.1,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
            {
              iterations: flutterIterations,
            }
          ),

          // 紙が表裏にひっくり返る
          Animated.loop(
            Animated.sequence([
              Animated.timing(particle.flutter, {
                toValue: 1,
                duration: flutterDuration,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),

              Animated.timing(particle.flutter, {
                toValue: -1,
                duration: flutterDuration,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
            {
              iterations: flutterIterations,
            }
          ),

          // 発射直後に少し大きくし、その後元に戻す
          Animated.sequence([
            Animated.timing(particle.s, {
              toValue: 1.15,
              duration: 150,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),

            Animated.timing(particle.s, {
              toValue: 1,
              duration: totalDuration - 150,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),

          // 終盤にフェードアウト
          Animated.sequence([
            Animated.delay(totalDuration * 0.72),

            Animated.timing(particle.o, {
              toValue: 0,
              duration: totalDuration * 0.28,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]);
    });

    const animation = Animated.parallel(animations);

    animation.start(({ finished }) => {
      if (finished) {
        setVisible(false);
      }
    });

    return () => {
      animation.stop();
    };
  }, [tick, particles]);

  if (!visible) return null;

  const useOrigin = origin ?? { x: 0, y: 0 };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          crackerStyles.origin,
          {
            left: useOrigin.x,
            top: useOrigin.y,
          },
        ]}
      >
        {particles.map((particle, index) => {
          const rotateZ = particle.r.interpolate({
            inputRange: [-1800, 1800],
            outputRange: ['-1800deg', '1800deg'],
          });

          const rotateY = particle.flutter.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: ['-40deg', '0deg', '40deg'],
          });

          const flutterScaleX = particle.flutter.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.7, 1, 0.7],
          });

          // 全て同じ正方形サイズ
          const width = 10;
          const height = 10;
          const borderRadius = 1;

          return (
            <Animated.View
              key={index}
              style={[
                crackerStyles.piece,
                {
                  width,
                  height,
                  borderRadius,
                  backgroundColor: colors[index] ?? tint,
                  opacity: particle.o,
                  transform: [
                    {
                      translateX: Animated.add(
                        particle.x,
                        particle.sway
                      ),
                    },
                    { translateY: particle.y },

                    // 3D回転に必要
                    { perspective: 500 },

                    // 画面に対する平面回転
                    { rotateZ },

                    // 紙が表裏にひっくり返る
                    { rotateY },

                    // 横を向いたときに細く見せる
                    { scaleX: flutterScaleX },

                    { scale: particle.s },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const crackerStyles = StyleSheet.create({
  origin: {
    position: 'absolute',
    // origin地点が「点」になるように
    width: 1,
    height: 1,
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});

const styles = StyleSheet.create({
  baseText: {
    fontFamily: 'ZenMaruGothic_400Regular',
  },

  title: {
    textAlign: 'center',
    width: '100%',  
    fontFamily: 'ZenMaruGothic_700Bold',
    fontSize: 28,
  },

  semiBold: {
    fontFamily: 'ZenMaruGothic_700Bold',
  },

  textOutline: {
    color: '#5C7EA6',
    textShadowColor: 'rgba(217, 140, 74, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  taskStack: {
    width: '100%',
    paddingHorizontal: 18,
    alignItems: 'center',
  },

  safe: { flex: 1 },

  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  header: {
    height: 100,              // ← 固定（ここが肝）
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  catchText: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    opacity: 0.75,
    zIndex: 10,
  },

  stage: {
    flex: 1,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },

  overlayCenter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 50,
  },

  circleButton: {
    width: 220,
    height: 220,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  circleText: { fontSize: 20 },

  // ✅ カードの外側調整だけにして、内側は card の padding に任せる
  taskWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  taskLabel: {
    opacity: 0.7,
    marginBottom: 2,
    textAlign: 'center',
    fontSize: 20,
  },

  taskText: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
    paddingTop: 2,
  },

  completeBtn: {
    borderColor: 'transparent',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },

  completeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  praiseText: {
    marginTop: 50,
    fontSize: 20,
    fontWeight: '800',
    opacity: 0.95,
    textAlign: 'center',
    color: '#FFC166',
  },

  extraBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 200,      // ✅ 追加
    elevation: 200,   // ✅ Android
  },

  extraText: {
    fontSize: 16,
    opacity: 0.6,
  },

  taskLabelArea: {
    marginBottom: 10, // ← 余白は外側に逃がす
    alignItems: 'center',
  },

  taskLabelWrap: {
    alignItems: 'center',
    position: 'relative', // ★必須
  },
  
  taskLabelText: {
    paddingBottom: 3, // 文字と下線の隙間を自分で作る
  },
  
  doubleUnderlineAbsolute: {
    position: 'absolute',
    bottom: 0,        // ★文字の直下に来る
    alignItems: 'center',
  },
  
  underlinePrimary: {
    width: 120,
    height: 2,
    backgroundColor: 'rgba(92,126,166,0.45)',
    borderRadius: 1,
  },
  
  underlineSecondary: {
    marginTop: 3,
    width: 120,
    height: 1,
    backgroundColor: 'rgba(92,126,166,0.45)',
    borderRadius: 1,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  infoIcon: {
    marginLeft: 8,
    fontSize: 16,
    opacity: 0.7,
  },
  
  descriptionBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  
  descriptionText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },

  infoBtn: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  
  infoText: {
    fontSize: 16,
    opacity: 0.85,
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
    textAlign: 'center',
    marginBottom: 10,
  },

  descModalTaskLabel: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
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
  },
  
  descText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
  },

  praiseOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 50,          // タブバーの上に出す（被るなら 110〜130 に上げる）
    alignItems: 'center',
  },
  
});