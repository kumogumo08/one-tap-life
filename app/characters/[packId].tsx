import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CHARACTER_BY_ID, isCharacterPackId } from '@/src/data/characters';
import { getPackById, isPackOwned } from '@/src/lib/characterAccess';

export default function CharacterPackDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { packId: packIdParam } = useLocalSearchParams<{
    packId?: string | string[];
  }>();

  const rawPackId = Array.isArray(packIdParam) ? packIdParam[0] : packIdParam;
  const packId = isCharacterPackId(rawPackId) ? rawPackId : null;
  const pack = packId ? getPackById(packId) : undefined;

  // free パックや不正IDは詳細対象外
  const isValidShopPack = !!pack && pack.id !== 'free';

  const characters = useMemo(() => {
    if (!pack || !isValidShopPack) return [];
    return pack.characterIds
      .map((id) => CHARACTER_BY_ID[id])
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [pack, isValidShopPack]);

  const owned = packId ? isPackOwned(packId) : false;

  // ダークでは tint が #fff のためボタン背景に使わない
  const purchaseBtnBg = isDark ? '#2C3136' : theme.tint;
  const purchaseBtnBorder = isDark ? '#687076' : 'transparent';
  const purchaseBtnTextColor = isDark ? theme.text : '#fff';

  const onPressPurchase = () => {
    Alert.alert('準備中', 'このパックの購入機能は今後追加予定です。');
  };

  const footerPaddingBottom = Math.max(insets.bottom, 16);

  if (!isValidShopPack || !pack) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['bottom']}>
        <View style={styles.fallback}>
          <ThemedText>パックが見つかりません</ThemedText>
          <Pressable onPress={() => router.back()} style={styles.fallbackBtn}>
            <ThemedText style={styles.fallbackBtnText}>戻る</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: pack.name }} />
      <View style={[styles.safe, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: owned ? 24 : 24 + 52 + footerPaddingBottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.packName}>{pack.name}</ThemedText>
          <ThemedText style={styles.packDesc}>{pack.description}</ThemedText>

          <ThemedText style={styles.status}>
            {owned ? '購入済み' : '未購入'}
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>含まれるキャラクター</ThemedText>

          {characters.map((character) => (
            <View key={character.id} style={styles.card}>
              <Image source={character.image} style={styles.thumb} />
              <View style={styles.cardText}>
                <ThemedText style={styles.cardTitle}>{character.name}</ThemedText>
                {!!character.description && (
                  <ThemedText style={styles.cardSub}>{character.description}</ThemedText>
                )}
                {!owned && (
                  <ThemedText style={styles.lockedHint}>
                    未購入のため選択できません
                  </ThemedText>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {!owned && (
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: theme.background,
                paddingBottom: footerPaddingBottom,
                borderTopColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <Pressable
              onPress={onPressPurchase}
              style={({ pressed }) => [
                styles.purchaseBtn,
                {
                  backgroundColor: purchaseBtnBg,
                  borderColor: purchaseBtnBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
            >
              <ThemedText style={[styles.purchaseBtnText, { color: purchaseBtnTextColor }]}>
                購入機能は準備中
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  packName: {
    fontSize: 22,
    fontWeight: '800',
  },
  packDesc: {
    marginTop: 8,
    opacity: 0.8,
    lineHeight: 20,
  },
  status: {
    marginTop: 12,
    fontWeight: '700',
    opacity: 0.75,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
  },
  card: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  cardSub: {
    opacity: 0.7,
    fontSize: 13,
    lineHeight: 18,
  },
  lockedHint: {
    marginTop: 2,
    fontSize: 12,
    opacity: 0.55,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  purchaseBtn: {
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  purchaseBtnText: {
    fontWeight: '800',
    fontSize: 16,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  fallbackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fallbackBtnText: {
    fontWeight: '700',
  },
});
