// app/premium.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  LEVEL2_REQUIRED_COMPLETIONS,
  LEVEL2_REQUIRED_DAYS,
  LEVEL3_REQUIRED_COMPLETIONS,
  LEVEL3_REQUIRED_DAYS,
} from '@/src/lib/progress';

export default function PremiumPage() {
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.h1}>追加プランについて</ThemedText>
          <ThemedText style={styles.sub}>
            タスクのレベル1〜3は継続利用で解放できます。課金は不要です。
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>レベルについて</ThemedText>
          <ThemedText style={styles.list}>・レベル1：最初から利用できます</ThemedText>
          <ThemedText style={styles.list}>
            ・レベル2：初回完了から{LEVEL2_REQUIRED_DAYS}日経過かつ{LEVEL2_REQUIRED_COMPLETIONS}回達成で解放
          </ThemedText>
          <ThemedText style={styles.list}>
            ・レベル3：初回完了から{LEVEL3_REQUIRED_DAYS}日経過かつ{LEVEL3_REQUIRED_COMPLETIONS}回達成で解放
          </ThemedText>
          <ThemedText style={styles.list}>・設定画面から、いつでも解放済みレベルを選べます</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  header: { marginBottom: 12 },
  h1: { fontSize: 20, fontWeight: '700' },
  sub: { marginTop: 6, opacity: 0.8 },

  card: {
    padding: 14,
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  list: { marginTop: 4, lineHeight: 20, opacity: 0.9 },
});
