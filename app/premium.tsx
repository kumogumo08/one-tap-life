// app/premium.tsx
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  defaultPremiumState,
  getTrialActive,
  getTrialDaysLeft,
  PremiumState,
  TRIAL_DAYS,
} from '@/src/lib/premium';
import { readJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';

export default function PremiumPage() {
  const params = useLocalSearchParams<{ from?: string }>();
  const from = params?.from ?? 'settings';

  const [p, setP] = useState<PremiumState>(defaultPremiumState);

  const trialActive = useMemo(() => getTrialActive(p), [p]);
  const daysLeft = useMemo(() => getTrialDaysLeft(p), [p]);

  const status = useMemo(() => {
    if (p.isPremium) return 'premium';
    if (!p.trialConsumed) return 'not_started';
    if (trialActive) return 'trial_active';
    return 'trial_expired';
  }, [p.isPremium, p.trialConsumed, trialActive]);

  useEffect(() => {
    let alive = true;
  
    (async () => {
      try {
        const raw = await readJson<PremiumState | null>(STORAGE_KEYS.premium, null);
        if (!alive) return;
        setP(raw ? { ...defaultPremiumState, ...raw } : defaultPremiumState);
      } catch {
        if (!alive) return;
        setP(defaultPremiumState);
      }
    })();
  
    return () => {
      alive = false;
    };
  }, []);

  const startTrial = useCallback(async () => {
    // 今回の公開ではプレミアム（体験含む）はロック
    Alert.alert(
      '準備中',
      'プレミアム機能（無料体験を含む）は現在準備中です。次回アップデートで解放予定です。'
    );
  }, []);
  
  const purchasePremium = useCallback(async () => {
    // 今回の公開では購入処理（IAP）未実装のためロック
    Alert.alert(
      '準備中',
      '購入機能は現在準備中です。次回アップデートで解放予定です。'
    );
  }, []);

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 状態ヘッダー */}
        <View style={styles.header}>
          <ThemedText style={styles.h1}>プレミアム機能のご案内（現在準備中）</ThemedText>
  
          <ThemedText style={styles.sub}>
            {from === 'level2' ? 'レベル2は次回アップデートで提供予定です。' : null}
            {from === 'level3' ? 'レベル3は次回アップデートで提供予定です。' : null}
            {!from ? '次回アップデートでプレミアム機能を提供予定です。' : null}
          </ThemedText>
  
          <ThemedText style={styles.sub}>
            ※このバージョンでは無料体験・購入は利用できません。
          </ThemedText>
        </View>

        {/* 体験開始カード（未開始だけ表示） */}
        {status === 'not_started' && (
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>初回{TRIAL_DAYS}日間の体験</ThemedText>
            <ThemedText style={styles.cardBody}>
              ・レベル2を利用できる予定です{'\n'}
              ・「もう1つやる」は 1日5回までを想定しています{'\n'}
              ・演出・褒め言葉の一部が増える予定です
            </ThemedText>

            <Pressable onPress={startTrial} style={styles.primaryBtn}>
              <ThemedText style={styles.primaryBtnText}>体験を開始する</ThemedText>
            </Pressable>
          </View>
        )}

        {/* プラン比較 */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>プラン比較</ThemedText>

          <ThemedText style={styles.sectionTitle}>無料（レベル1）</ThemedText>
          <ThemedText style={styles.list}>・今日のタスク：レベル1のみ</ThemedText>
          <ThemedText style={styles.list}>・もう1つやる：1日3回まで</ThemedText>

          <ThemedText style={styles.sectionTitle}>体験（初回{TRIAL_DAYS}日）</ThemedText>
          <ThemedText style={styles.list}>・レベル2を利用できる予定</ThemedText>
          <ThemedText style={styles.list}>・もう1つやる：1日5回まで</ThemedText>

          <ThemedText style={styles.sectionTitle}>プレミアム</ThemedText>
          <ThemedText style={styles.list}>・レベル2 + レベル3（将来のプレミアム機能）</ThemedText>
          <ThemedText style={styles.list}>・もう1つやる：無制限（将来の仕様）</ThemedText>
          <ThemedText style={styles.list}>・褒め言葉：ギャル／執事／メイドなど増量</ThemedText>
          <ThemedText style={styles.list}>・完了演出：より豪華</ThemedText>
        </View>

        {/* レベル差 */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>レベル2とレベル3の違い</ThemedText>

          <ThemedText style={styles.sectionTitle}>レベル2（標準）</ThemedText>
          <ThemedText style={styles.list}>・ちょうどいい強度</ThemedText>
          <ThemedText style={styles.list}>・演出・褒めが増える</ThemedText>

          <ThemedText style={styles.sectionTitle}>レベル3（プレミアム）</ThemedText>
          <ThemedText style={styles.list}>・さらに豪華な演出</ThemedText>
          <ThemedText style={styles.list}>・特別な褒め（レア／長めなど）</ThemedText>
        </View>

        {/* FAQ */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>よくある質問</ThemedText>
          <ThemedText style={styles.sectionTitle}>体験は何回できますか？</ThemedText>
          <ThemedText style={styles.list}>・初回の1回だけです。</ThemedText>

          <ThemedText style={styles.sectionTitle}>体験が終わるとどうなりますか？</ThemedText>
          <ThemedText style={styles.list}>・レベル2はロックされ、プレミアムで解放できます。</ThemedText>
        </View>

        {/* 下の固定CTAの分だけ余白 */}
        {!p.isPremium && <View style={{ height: 90 }} />}
      </ScrollView>

      {/* 下固定CTA */}
      {!p.isPremium && (
        <View style={styles.bottomBar}>
          <Pressable onPress={purchasePremium} style={styles.ctaBtn}>
          <ThemedText style={styles.ctaText}>プレミアムは現在準備中です</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  header: { marginBottom: 12 },
  h1: { fontSize: 20, fontWeight: '700' },
  sub: { marginTop: 6, opacity: 0.8 },

  card: { padding: 14, borderRadius: 16, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  cardBody: { lineHeight: 20, opacity: 0.9 },

  sectionTitle: { marginTop: 10, fontWeight: '700' },
  list: { marginTop: 4, lineHeight: 20, opacity: 0.9 },

  primaryBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  primaryBtnText: { fontWeight: '700' },

  bottomBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  ctaBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  ctaText: { fontWeight: '800' },
});
