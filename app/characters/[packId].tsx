import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePackAccessVersion } from '@/hooks/use-pack-access';
import { CHARACTER_BY_ID, isCharacterPackId } from '@/src/data/characters';
import {
  applyRevenueCatFamilyPackOwnership,
  getPackById,
  isPackOwned,
} from '@/src/lib/characterAccess';
import {
  getFamilyPackPackage,
  getLocalizedPriceString,
  getRevenueCatUnavailableMessage,
  purchaseFamilyPack,
  restoreFamilyPackPurchases,
} from '@/src/lib/revenueCat';

type OfferState =
  | { status: 'loading' }
  | { status: 'ready'; priceLabel: string }
  | { status: 'unavailable'; message: string };

export default function CharacterPackDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  // DEV override / RevenueCat 更新時に再描画する
  usePackAccessVersion();
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

  const [offerState, setOfferState] = useState<OfferState>({ status: 'loading' });
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadOffer = useCallback(async () => {
    if (!isValidShopPack || packId !== 'family_pack') return;

    setOfferState({ status: 'loading' });

    const unavailable = getRevenueCatUnavailableMessage();
    if (unavailable) {
      setOfferState({ status: 'unavailable', message: unavailable });
      return;
    }

    const pkg = await getFamilyPackPackage();
    if (!pkg) {
      setOfferState({
        status: 'unavailable',
        message: '商品情報を取得できませんでした',
      });
      return;
    }

    setOfferState({
      status: 'ready',
      priceLabel: getLocalizedPriceString(pkg),
    });
  }, [isValidShopPack, packId]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

  // ダークでは tint が #fff のためボタン背景に使わない
  const purchaseBtnBg = isDark ? '#2C3136' : theme.tint;
  const purchaseBtnBorder = isDark ? '#687076' : 'transparent';
  const purchaseBtnTextColor = isDark ? theme.text : '#fff';

  const purchaseDisabled =
    purchasing ||
    restoring ||
    offerState.status !== 'ready';

  const purchaseButtonLabel = (() => {
    if (purchasing) return '購入処理中...';
    if (offerState.status === 'loading') return '価格を取得中...';
    if (offerState.status === 'unavailable') return '商品情報を取得できませんでした';
    return `${offerState.priceLabel}で購入`;
  })();

  const onPressPurchase = async () => {
    if (purchaseDisabled) return;

    setPurchasing(true);
    try {
      const result = await purchaseFamilyPack();

      if (result.status === 'cancelled') {
        return;
      }

      if (result.status === 'unavailable' || result.status === 'error') {
        Alert.alert('購入できませんでした', result.message);
        return;
      }

      applyRevenueCatFamilyPackOwnership(result.hasFamilyPack);

      if (result.hasFamilyPack) {
        Alert.alert('購入完了', 'ファミリーパックが利用可能になりました。');
      } else {
        Alert.alert(
          '確認',
          '購入は完了しましたが、ファミリーパックの権限を確認できませんでした。購入を復元をお試しください。'
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const onPressRestore = async () => {
    if (purchasing || restoring) return;

    setRestoring(true);
    try {
      const result = await restoreFamilyPackPurchases();

      if (result.status === 'unavailable' || result.status === 'error') {
        Alert.alert('復元できませんでした', result.message);
        return;
      }

      applyRevenueCatFamilyPackOwnership(result.hasFamilyPack);

      if (result.hasFamilyPack) {
        Alert.alert('復元完了', 'ファミリーパックの購入を復元しました。');
      } else {
        Alert.alert('復元結果', '復元できる購入が見つかりませんでした。');
      }
    } finally {
      setRestoring(false);
    }
  };

  const footerPaddingBottom = Math.max(insets.bottom, 16);
  const footerHeight = owned ? 0 : 52 + 44 + 12;

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
            { paddingBottom: owned ? 24 : 24 + footerHeight + footerPaddingBottom },
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

          {owned && (
            <Pressable
              onPress={() => void onPressRestore()}
              disabled={restoring || purchasing}
              style={styles.restoreInlineBtn}
              accessibilityRole="button"
            >
              <ThemedText style={styles.restoreInlineText}>
                {restoring ? '復元中...' : '購入を復元'}
              </ThemedText>
            </Pressable>
          )}
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
              onPress={() => void onPressPurchase()}
              disabled={purchaseDisabled}
              style={({ pressed }) => [
                styles.purchaseBtn,
                {
                  backgroundColor: purchaseBtnBg,
                  borderColor: purchaseBtnBorder,
                  opacity: purchaseDisabled ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: purchaseDisabled }}
            >
              <ThemedText style={[styles.purchaseBtnText, { color: purchaseBtnTextColor }]}>
                {purchaseButtonLabel}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => void onPressRestore()}
              disabled={restoring || purchasing}
              style={styles.restoreBtn}
              accessibilityRole="button"
            >
              <ThemedText style={styles.restoreBtnText}>
                {restoring ? '復元中...' : '購入を復元'}
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
    gap: 8,
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
  restoreBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  restoreBtnText: {
    fontWeight: '700',
    fontSize: 14,
    opacity: 0.8,
  },
  restoreInlineBtn: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreInlineText: {
    fontWeight: '700',
    fontSize: 14,
    opacity: 0.75,
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
