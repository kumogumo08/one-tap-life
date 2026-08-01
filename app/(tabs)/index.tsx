import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GAL_PRAISES_LV1, SERIOUS_PRAISES_LV1 } from '@/src/data/praises';
import { getDescriptionByLabel } from '@/src/data/tasks';
import { pickTask } from '@/src/lib/pickTask';
import {
  defaultPremiumState,
  getTrialActive,
  loadPremiumState,
  PremiumState,
} from '@/src/lib/premium';
import { readJson, writeJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type { DailyState, HistoryItem, PraiseStyle, TaskLevel } from '@/src/types/storage';
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

type Phase = 'idle' | 'animating' | 'showTask';

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

const pickPraise = (style: PraiseStyle = 'gal') => {
  const source = style === 'serious' ? SERIOUS_PRAISES_LV1 : GAL_PRAISES_LV1;

  if (!Array.isArray(source) || source.length === 0) {
    return 'よくやりました。';
  }

  return source[Math.floor(Math.random() * source.length)];
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const addHistory = async (
  taskText: string,
  taskId: string | null | undefined,
  isExtra = false
) => {
  const item: HistoryItem = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    task: taskText,
    ts: Date.now(),
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
    await writeJson(STORAGE_KEYS.history, next);
  } catch {
    // 本番では静かに失敗させる
  }
};

export default function HomeScreen() {
  // Hooksは必ず先頭で固定順に
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // ✅ まず state（pickTask が daily を参照するため）
  const [daily, setDaily] = useState<DailyState | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [task, setTask] = useState<string>('');
  const phaseRef = useRef<Phase>('idle');
  const taskRef = useRef<string>('');
  const [typed, setTyped] = useState<string>('');
  const [praiseStyle, setPraiseStyle] = useState<PraiseStyle>('gal');
  const [extraInProgress, setExtraInProgress] = useState(false);
  const [level, setLevel] = useState<TaskLevel>(1);
  const [ready, setReady] = useState(false);
  const [praiseTick, setPraiseTick] = useState(0);
  const [openDesc, setOpenDesc] = useState(false);

  const descY = useRef(new Animated.Value(8)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;

  const [premiumState, setPremiumState] = useState<PremiumState>(defaultPremiumState);
  const selectedCharacter: 'gal' | 'serious' =
  praiseStyle === 'serious' ? 'serious' : 'gal';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    Animated.parallel([
      Animated.timing(descOpacity, {
        toValue: openDesc ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(descY, {
        toValue: openDesc ? 0 : 8,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [openDesc]);

  useEffect(() => {
    setOpenDesc(false);
  }, [task]);

  const toggleDesc = useCallback(() => {
    setOpenDesc(prev => !prev);
  }, []);

  const opRef = useRef(false); // ✅ ユーザーが操作したらtrue

  // 公開版ゲート済みレベルで抽選（保存上の level と食い違わないようにする）
  const activeLevel = normalizeAvailableLevel(level);

  // --- 以下、あなたの既存コード続き ---
  const btnOpacity = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const taskOpacity = useRef(new Animated.Value(0)).current;
  const taskY = useRef(new Animated.Value(8)).current;

  const [canComplete, setCanComplete] = useState(false);
  const [currentIsExtra, setCurrentIsExtra] = useState(false);
  const [praise, setPraise] = useState('');
  const [typedPraise, setTypedPraise] = useState('');

  const completeBtnRef = useRef<View | null>(null);
  const [crackerTick, setCrackerTick] = useState(0);
  const [crackerOrigin, setCrackerOrigin] = useState<Origin | null>(null);

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

  const extraLimit = getExtraLimit();        // ✅ 先に計算
  const extraCount = daily?.extraCount ?? 0; // ✅ 次に count

  const canShowExtraButton =
    ready &&
    !!daily?.completed &&
    !extraInProgress &&
    extraCount < extraLimit;

  const triggerCracker = () => setCrackerTick(t => t + 1);

  const [fontsLoaded] = useFonts({
    ZenMaruGothic_400Regular,
    ZenMaruGothic_700Bold,
  });

  // 今日状態を復元（アプリ起動/画面初回）
  useFocusEffect(
    useCallback(() => {
      let alive = true;
  
      const run = async () => {
        if (!alive) return;
        setReady(false);
  
        try {
          // --- settings load ---
          try {
            const rawSettings = await readJson<unknown>(STORAGE_KEYS.settings, null);
            const settings = normalizeUserSettings(rawSettings);
            setPraiseStyle(settings.praiseStyle);
            // 抽選・表示は公開版ゲート後のレベルのみ使う
            setLevel(normalizeAvailableLevel(settings.level));
          } catch {}
  
          // --- premium load（もう1つやる上限のため）---
          try {
            const p = await loadPremiumState();
            if (!alive) return;
            setPremiumState(p);
          } catch {
            setPremiumState(defaultPremiumState);
          }
  
          // --- daily load ---
          const todayKey = dateKeyLocal(new Date());
          const rawDaily = await readJson<unknown>(STORAGE_KEYS.daily, null);

          if (rawDaily == null) {
            const fresh = DEFAULT_DAILY_STATE(todayKey);
            await writeJson(STORAGE_KEYS.daily, fresh);
            if (!alive) return;
            setDaily(fresh);
            setPhase('idle');
            phaseRef.current = 'idle';
            setTask('');
            setTyped('');
            setTypedPraise('');
            setOpenDesc(false);
            btnOpacity.setValue(1);
            btnScale.setValue(1);
            taskOpacity.setValue(0);
            taskY.setValue(8);
            return;
          }

          const saved = normalizeDailyState(rawDaily, todayKey);
  
          // ① 日付違い → fresh作成（UIも初期化）
          if (saved.dateKey !== todayKey) {
            const fresh = DEFAULT_DAILY_STATE(todayKey);
  
            await writeJson(STORAGE_KEYS.daily, fresh);
            if (!alive) return;
  
            setDaily(fresh);
  
            // UI初期化（ここは “安全に上書きして良い”）
            setPhase('idle');
            setTask('');
            setTyped('');
            btnOpacity.setValue(1);
            btnScale.setValue(1);
            taskOpacity.setValue(0);
            taskY.setValue(8);
  
            return; // ✅ この return は finally を通る形で使う（runの外ではない）
          }
  
          // ② migration 済み形で保存し直し（フィールド欠落補完）
          if (!alive) return;
  
          setDaily(saved);
          await writeJson(STORAGE_KEYS.daily, saved);
  
          // ③ completed のときは表示復元
          if (saved.completed && saved.task) {
            setTask(saved.task);
            setTyped(saved.task);
            setPhase('showTask');
          
            // 完了してるなら完了ボタンは出さない
            setCanComplete(false);
            setCurrentIsExtra(false);
          
            btnOpacity.setValue(0);
            btnScale.setValue(0.95);
            taskOpacity.setValue(1);
            taskY.setValue(0);
            return;
          }
          
          // ✅ ③.5 未完了だが task がある（＝今日タスクは確定済み）→ 表示復元（完了ボタンあり）
          if (!saved.completed && saved.task) {
            setTask(saved.task);
            setTyped(saved.task); // タイピング演出をしたいなら '' にしてもOK
            setPhase('showTask');
          
            // 未完了なので完了ボタンを出す
            setCanComplete(true);
            setCurrentIsExtra(false);
          
            btnOpacity.setValue(0);
            btnScale.setValue(0.95);
            taskOpacity.setValue(1);
            taskY.setValue(0);
            return;
          }
          
          // ④ 未完了かつ task も空の場合だけ、idle に戻す（ただし操作中は触らない）
          const userAlreadyOperating =
            opRef.current ||
            phaseRef.current !== 'idle' ||
            !!taskRef.current;
          
          if (userAlreadyOperating) return;
          
          setPhase('idle');
          setTask('');
          setTyped('');
          btnOpacity.setValue(1);
          btnScale.setValue(1);
          taskOpacity.setValue(0);
          taskY.setValue(8);
        } catch {
          // 本番ではログ出さない
        } finally {
          if (alive) setReady(true);
        }
      };
  
      run();
  
      return () => {
        alive = false;
      };
    }, [])
  );  

     // 追加でもう1つやる（dailyは触らない）
     const onExtraTap = async () => {
      if (!daily?.completed) return;
      if (extraInProgress) return;
    
      const limit = getExtraLimit();
      const count = daily.extraCount ?? 0;
      if (count >= limit) return;
    
      setExtraInProgress(true);
    
      // 先にUI初期化
      taskOpacity.setValue(0);
      taskY.setValue(8);
    
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    
      const picked = pickTask(activeLevel, daily.lastTaskId ?? null);
    
      // ✅ UI先
      setTask(picked.label);
      setTyped('');
      setPhase('animating');
      setCanComplete(true);
      setCurrentIsExtra(true);
      setPraise('');
      setTypedPraise('');
    
      const nextDaily: DailyState = { ...daily, lastTaskId: picked.id };
      setDaily(nextDaily);
    
      Animated.parallel([
        Animated.timing(taskOpacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(taskY, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(() => setPhase('showTask'));
    
      // ✅ 保存は後追い
      await writeJson(STORAGE_KEYS.daily, nextDaily);
    }; 

    const onTap = async () => {
    
      if (!ready) return;
    
      opRef.current = true;
    
      // ✅ 先にUIを「見える側」に倒す（awaitより前）
      setPhase('animating');
      setCanComplete(true);
      setCurrentIsExtra(false);
      setTyped('');          // ←最優先で消す
      setTypedPraise('');
      setPraise('');

      taskOpacity.setValue(0);
      taskY.setValue(8);
    
      const baseDaily: DailyState = daily ?? DEFAULT_DAILY_STATE(dateKeyLocal(new Date()));
    
      if (baseDaily.completed) return;
    
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    
      const picked = baseDaily.task ? null : pickTask(activeLevel, baseDaily.lastTaskId ?? null);
      const todayTask = baseDaily.task || picked?.label || '水をコップ1杯飲む';
    
      // ✅ ここで task を確定（表示は typed||task なので即見える）
      setTask(todayTask);
    
      const nextDaily: DailyState = {
        ...baseDaily,
        dateKey: dateKeyLocal(new Date()),
        task: todayTask,
        completed: false,
        lastTaskId: baseDaily.task ? (baseDaily.lastTaskId ?? null) : (picked?.id ?? null),
      };
    
      setDaily(nextDaily);
      await writeJson(STORAGE_KEYS.daily, nextDaily);
    
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(btnScale,   { toValue: 0.95, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(taskOpacity,{ toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(taskY,      { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setPhase('showTask');   // ✅ finishedガード
      });
    };

    // ✅ 追加：refを常に最新のstateに追従させる
    useEffect(() => {
      phaseRef.current = phase;
    }, [phase]);

    useEffect(() => {
      taskRef.current = task;
    }, [task]);

    const onComplete = async () => {
      if (!task || !canComplete) return;
    
      opRef.current = true;
    
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    
      // 履歴に保存（ここが唯一の addHistory）
      await addHistory(task, daily?.lastTaskId, currentIsExtra);
    
      if (!currentIsExtra) {
        const nextDaily: DailyState = {
          ...(daily ?? DEFAULT_DAILY_STATE(dateKeyLocal(new Date()))),
          dateKey: dateKeyLocal(new Date()),
          task,
          completed: true,
          completedTs: Date.now(),
          extraCount: daily?.extraCount ?? 0,
          lastTaskId: daily?.lastTaskId ?? null,
        };
        setDaily(nextDaily);
        await writeJson(STORAGE_KEYS.daily, nextDaily);
      } else {
        const nextDaily: DailyState = {
          ...(daily ?? {
            ...DEFAULT_DAILY_STATE(dateKeyLocal(new Date())),
            completed: true,
          }),
          completed: true,
          extraCount: (daily?.extraCount ?? 0) + 1,
          lastTaskId: daily?.lastTaskId ?? null,
        };
        setDaily(nextDaily);
        await writeJson(STORAGE_KEYS.daily, nextDaily);
    
        opRef.current = false;
      }
    
      setCanComplete(false);
    
      // ✅ 褒めタイピング：同じ文言でも必ず再生されるようにする
      const msg = pickPraise(praiseStyle);
      setTypedPraise('');          // 表示を一旦消す
      setPraise(msg);              // 元文をセット
      setPraiseTick(t => t + 1);   // ✅ 同じmsgでも effect を必ず走らせる
    
      // 完了ボタンの位置からクラッカー
      const done = () => {
        triggerCracker();
        setExtraInProgress(false);
      };
    
      if (completeBtnRef.current && (completeBtnRef.current as any).measureInWindow) {
        (completeBtnRef.current as any).measureInWindow((x: number, y: number, w: number, h: number) => {
          setCrackerOrigin({ x: x + w / 2, y: y + h / 2 });
          done();
        });
      } else {
        setCrackerOrigin(null);
        done();
      }
    };    

// タイプ演出（showTask に入ったら毎回、確実にリセットして開始）
useEffect(() => {
  if (phase !== 'showTask' || !task) return;

  // まず確実に空にする（前回の残像対策）
  setTyped('');

  let i = 0;

  // 次フレームから刻み開始（描画順のチラつき対策）
  const raf = requestAnimationFrame(() => {
    const id = setInterval(() => {
      i += 1;
      setTyped(task.slice(0, i));
      if (i >= task.length) clearInterval(id);
    }, 110);

    // raf内で作ったintervalをeffectのcleanupで消せるようにする
    (cleanup as any).id = id;
  });

  function cleanup() {
    cancelAnimationFrame(raf);
    const id = (cleanup as any).id as ReturnType<typeof setInterval> | undefined;
    if (id) clearInterval(id);
  }

  return cleanup;
}, [phase, task]);


// 完了後の褒めメッセージをタイピング表示（praise が変わるたび確実にリセット）
useEffect(() => {
  if (!praise) return;

  setTypedPraise('');
  let i = 0;

  const id = setInterval(() => {
    i += 1;
    setTypedPraise(praise.slice(0, i));
    if (i >= praise.length) clearInterval(id);
  }, 70);

  return () => clearInterval(id);
}, [praise, praiseTick]);

const currentDesc = getDescriptionByLabel(task);

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
            tint={theme.tint}
            palette={[
              '#FF3B30',
              '#FF9500',
              '#FFCC00',
              '#34C759',
              '#007AFF',
              '#5856D6',
              '#AF52DE',
              '#FF2D55',
            ]}
            count={20}
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

              {/* ✅ ワンタップは「idle の時だけ」描画（完了状態でも表示はする） */}
              {phase === 'idle' && (
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
                      { borderColor: theme.tint },
                      !ready && { opacity: 0.4 },
                    ]}
                  >
                    <IconSymbol size={38} name="hand.tap.fill" color={theme.tint} />
                    <ThemedText type="defaultSemiBold" style={[styles.circleText, styles.textOutline]}>
                      ワンタップ
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              )}
                {/* ✅ タスク表示 */}
                {phase !== 'idle' ? (
                  <Animated.View
                    style={[
                      styles.overlayCenter,
                      { opacity: taskOpacity, transform: [{ translateY: taskY }] },
                    ]}
                  >
                    {/* ★ ここで上に寄せる（-30〜-70で調整） */}
                    <View style={[styles.taskStack, { transform: [{ translateY: -40 }] }]}>
                      <View style={styles.taskLabelArea}>
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
                      </View>

                      <ThemedText style={[styles.taskText, styles.semiBold, styles.textOutline]}>
                        {typed}
                      </ThemedText>

                      {/* ⓘ（説明があるタスクだけ表示） */}
                      {!!currentDesc && (
                        <Pressable onPress={toggleDesc} style={styles.infoBtn}>
                          <ThemedText style={[styles.infoText, styles.textOutline]}>ⓘ</ThemedText>
                        </Pressable>
                      )}

                      {/* 下からスライド（実際は translateY + opacity） */}
                      {!!currentDesc && openDesc && (
                        <Animated.View
                          style={[
                            styles.descBox,
                            { opacity: descOpacity, transform: [{ translateY: descY }] },
                          ]}
                        >
                          <ThemedText style={[styles.descText, styles.textOutline]}>
                            {currentDesc}
                          </ThemedText>
                        </Animated.View>
                      )}

                      {canComplete && (
                        <Pressable
                          ref={completeBtnRef as any}
                          onPress={onComplete}
                          style={[
                            styles.completeBtn,
                            { borderColor: theme.tint, backgroundColor: theme.tint },
                          ]}
                        >
                          <ThemedText style={[styles.completeText, styles.semiBold, styles.textOutline]}>
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

              {/* ✅ 画面下にキャラ＋吹き出し（タスク中だけ） */}
              {!!typedPraise && phase !== 'idle' && (
                <View style={styles.praiseOverlay} pointerEvents="none">
                  <PraiseCharacter character={selectedCharacter} message={typedPraise} />
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ScreenWrapper>
  );
}

export function CrackerBurst({
  tick,
  origin,
  tint,
  count,
  palette, // ✅ 追加
}: CrackerBurstProps) {
  const [visible, setVisible] = useState(false);

  // ✅ COUNTを先に定義
  const COUNT = Math.min(18, Math.max(10, count ?? (10 + Math.floor(Math.random() * 9))));

  // ✅ tickごとに色を固定
  const colors = useMemo(() => {
    const pal = palette && palette.length > 0 ? palette : RAINBOW;
    return Array.from({ length: COUNT }).map((_, i) => pal[i % pal.length]);
  }, [tick, COUNT, palette]);

  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      r: new Animated.Value(0),
      o: new Animated.Value(0),
      s: new Animated.Value(1),
    }));
  }, []);

  useEffect(() => {
    if (!tick) return;

    setVisible(true);

    particles.forEach(p => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.r.setValue(0);
      p.o.setValue(1);
      p.s.setValue(1);
    });

    const anims: Animated.CompositeAnimation[] = [];

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];

      const angle = (-140 + Math.random() * 100) * (Math.PI / 180); // -140°〜-40°
      const speed = 140 + Math.random() * 140; // 140〜280
      const wind = (Math.random() - 0.5) * 40; // 散りも維持
      const dx = Math.cos(angle) * speed + wind;
      const dy = Math.sin(angle) * speed;

      const gravity = 220 + Math.random() * 220; // 220〜440
      const rot = Math.random() * 360 - 180;

      anims.push(
        Animated.parallel([
          Animated.timing(p.x, { toValue: dx, duration: 900, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(p.y, { toValue: dy, duration: 360, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: dy + gravity, duration: 540, useNativeDriver: true }),
          ]),
          Animated.timing(p.r, { toValue: rot, duration: 900, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(p.s, { toValue: 1.08, duration: 120, useNativeDriver: true }),
            Animated.timing(p.s, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(p.o, { toValue: 1, duration: 40, useNativeDriver: true }),
            Animated.timing(p.o, { toValue: 0, duration: 420, delay: 520, useNativeDriver: true }),
          ]),
        ])
      );
    }

    Animated.parallel(anims).start(() => setVisible(false));
  }, [tick, particles, COUNT]);

  if (!visible) return null;

  const fallback = { x: 0, y: 0 };
  const useOrigin = origin ?? fallback;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[crackerStyles.origin, { left: useOrigin.x, top: useOrigin.y }]}>
        {Array.from({ length: COUNT }).map((_, idx) => {
          const p = particles[idx];

          const rotate = p.r.interpolate({
            inputRange: [-180, 180],
            outputRange: ['-180deg', '180deg'],
          });

          const isDot = idx % 4 === 0;
          const w = isDot ? 6 : 6 + (idx % 3);
          const h = isDot ? 6 : 12 + (idx % 5);

          return (
            <Animated.View
              key={idx}
              style={[
                crackerStyles.piece,
                {
                  width: w,
                  height: h,
                  borderRadius: isDot ? 999 : 2, // ✅ ここで丸粒にする
                  backgroundColor: colors[idx] ?? tint,
                  opacity: p.o,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                    { rotate },
                    { scale: p.s },
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
    color: '#374151',
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    opacity: 0.75,
    zIndex: 10,            // ✅ 追加
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
    zIndex: 50,            // ✅ 追加
    elevation: 50,         // ✅ Android対策
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

  completeText: { color: '#fff',fontSize: 16, fontWeight: '800' },

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
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  
  infoText: {
    fontSize: 16,
    opacity: 0.85,
  },
  
  descBox: {
    marginTop: 10,
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
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