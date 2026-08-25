import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { dateKeyLocal, pad2 } from '@/src/lib/dateKey';
import { readJson, removeKey } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type { HistoryItem } from '@/src/types/storage';
import { normalizeHistoryList } from '@/src/types/storage';

function formatTimeLocal(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// 表示用：YYYY-MM-DD -> 2026/02/07 (土) みたいにする（曜日は簡易）
function formatDateLabel(yyyyMMdd: string) {
  const [y, m, d] = yyyyMMdd.split('-').map((v) => Number(v));
  const dt = new Date(y, m - 1, d);
  const w = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
  return `${y}/${pad2(m)}/${pad2(d)} (${w})`;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [items, setItems] = useState<HistoryItem[]>([]);
  const insets = useSafeAreaInsets();
  const [pastOpen, setPastOpen] = useState<Record<string, boolean>>({});

  const load = async () => {
    const raw = await readJson<unknown>(STORAGE_KEYS.history, []);
    setItems(normalizeHistoryList(raw));
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const clearAll = async () => {
    Alert.alert('履歴を削除', 'すべて削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await removeKey(STORAGE_KEYS.history);
          setItems([]);
          setPastOpen({});
        },
      },
    ]);
  };

  const grouped = useMemo(() => {
    const now = new Date();
    const todayKey = dateKeyLocal(now);

    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayKey = dateKeyLocal(y);

    const today: HistoryItem[] = [];
    const yesterday: HistoryItem[] = [];
    const past: HistoryItem[] = [];

    for (const it of items) {
      const key = dateKeyLocal(new Date(it.ts));
      if (key === todayKey) today.push(it);
      else if (key === yesterdayKey) yesterday.push(it);
      else past.push(it);
    }

    const sortDesc = (a: HistoryItem, b: HistoryItem) => b.ts - a.ts;
    today.sort(sortDesc);
    yesterday.sort(sortDesc);
    past.sort(sortDesc);

    // past を日付キーごとにまとめる（キーは新しい日付から）
    const byDate: Record<string, HistoryItem[]> = {};
    for (const it of past) {
      const key = dateKeyLocal(new Date(it.ts));
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(it);
    }
    // 各日の中も ts 降順
    for (const key of Object.keys(byDate)) {
      byDate[key].sort(sortDesc);
    }
    // 日付キーを新しい順に並べる（YYYY-MM-DD は文字列ソートでOK）
    const pastDates = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1));

    return { today, yesterday, pastDates, pastByDate: byDate };
  }, [items]);

  const togglePastDate = (dateKey: string) => {
    setPastOpen((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const openAllPast = () => {
    const next: Record<string, boolean> = {};
    for (const dk of grouped.pastDates) next[dk] = true;
    setPastOpen(next);
  };

  const closeAllPast = () => {
    setPastOpen({});
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.headerRow}>
          <ThemedText type="title">履歴</ThemedText>

          <View style={styles.headerActions}>
            {grouped.pastDates.length > 0 && (
              <>
                <Pressable onPress={openAllPast} style={styles.smallBtn}>
                  <ThemedText style={styles.smallBtnText}>全展開</ThemedText>
                </Pressable>
                <Pressable onPress={closeAllPast} style={styles.smallBtn}>
                  <ThemedText style={styles.smallBtnText}>全閉じ</ThemedText>
                </Pressable>
              </>
            )}

            <Pressable onPress={clearAll} style={styles.clearBtn}>
              <ThemedText style={styles.clearText}>全削除</ThemedText>
            </Pressable>
          </View>
        </View>

        {items.length === 0 ? (
          <ThemedText style={styles.emptyText}>まだ履歴がありません</ThemedText>
        ) : (
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: 12 + insets.bottom }]}>
            <Section title="今日" items={grouped.today} />
            <Section title="昨日" items={grouped.yesterday} />

            {/* 過去（折りたたみ） */}
            {grouped.pastDates.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <ThemedText style={styles.sectionTitle}>過去</ThemedText>

                {grouped.pastDates.map((dk) => {
                  const open = !!pastOpen[dk];
                  const count = grouped.pastByDate[dk]?.length ?? 0;

                  return (
                    <View key={dk} style={styles.pastGroup}>
                      <Pressable onPress={() => togglePastDate(dk)} style={styles.pastHeader}>
                        <ThemedText style={styles.pastHeaderText}>
                          {formatDateLabel(dk)}
                        </ThemedText>
                        <ThemedText style={styles.pastHeaderMeta}>
                          {open ? '▲' : '▼'} {count}件
                        </ThemedText>
                      </Pressable>

                      {open && (
                        <View style={{ marginTop: 10 }}>
                          {grouped.pastByDate[dk].map((it) => (
                            <View key={it.id} style={styles.card}>
                              <View style={styles.cardRow}>
                              <View style={styles.taskRow}>
                                <ThemedText style={styles.task}>{it.task}</ThemedText>
                                {it.isExtra && <ThemedText style={styles.extraBadge}>追加</ThemedText>}
                              </View>
                                <ThemedText style={styles.time}>{formatTimeLocal(it.ts)}</ThemedText>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

function Section({ title, items }: { title: string; items: HistoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>

      {items.map((it) => (
        <View key={it.id} style={styles.card}>
          <View style={styles.cardRow}>
          <View style={styles.taskRow}>
            <ThemedText style={styles.task}>{it.task}</ThemedText>
            {it.isExtra && <ThemedText style={styles.extraBadge}>追加</ThemedText>}
          </View>
            <ThemedText style={styles.time}>{formatTimeLocal(it.ts)}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },

  safe: { flex: 1 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  smallBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  smallBtnText: { opacity: 0.75 },

  clearBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  clearText: { opacity: 0.75 },

  emptyText: { opacity: 0.7, marginTop: 12 },

  list: { paddingBottom: 12 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
    marginBottom: 8,
  },

  pastGroup: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  pastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pastHeaderText: { fontSize: 16, fontWeight: '700' },
  pastHeaderMeta: { opacity: 0.65 },

  card: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  task: { fontSize: 18, fontWeight: '600', flexShrink: 1, flex: 1 },
  time: { opacity: 0.65 },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    flex: 1,
  },
  
  extraBadge: {
    fontSize: 12,
    opacity: 0.45,
    marginTop: 2,
  },
  
});
