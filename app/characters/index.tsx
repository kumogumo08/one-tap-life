import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePackAccessVersion } from '@/hooks/use-pack-access';
import { DEFAULT_CHARACTER_ID } from '@/src/data/characters';
import {
  ensureOwnedCharacterId,
  getAvailableCharacters,
  getPackCharacterNames,
  getShopPacks,
  initializePackAccess,
  isCharacterOwned,
  isPackOwned,
} from '@/src/lib/characterAccess';
import { syncDailyNotification } from '@/src/lib/notifications';
import { readJson, writeJson } from '@/src/lib/storage';
import { STORAGE_KEYS } from '@/src/lib/storageKeys';
import type { CharacterId, CharacterPackId } from '@/src/types/character';
import {
  normalizeUserSettings,
  toSavableUserSettings,
} from '@/src/types/storage';

export default function CharacterSelectScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  // DEV override 変更時に再描画する
  const packAccessVersion = usePackAccessVersion();
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<CharacterId>(DEFAULT_CHARACTER_ID);

  // 所有済み（無料含む）キャラのみ。未購入有料キャラは出さない
  const availableCharacters = getAvailableCharacters();
  // free 以外。未購入パックも必ず表示
  const shopPacks = getShopPacks();

  const load = useCallback(async () => {
    await initializePackAccess();
    const settings = normalizeUserSettings(
      await readJson<unknown>(STORAGE_KEYS.settings, null)
    );
    setSelectedCharacterId(ensureOwnedCharacterId(settings.selectedCharacterId));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    void load();
  }, [load, packAccessVersion]);

  const selectCharacter = async (characterId: CharacterId) => {
    if (!isCharacterOwned(characterId)) return;

    setSelectedCharacterId(characterId);

    const current = normalizeUserSettings(
      await readJson<unknown>(STORAGE_KEYS.settings, null)
    );
    const next = toSavableUserSettings({
      selectedCharacterId: characterId,
      level: current.level,
    });
    await writeJson(STORAGE_KEYS.settings, next);
    // 日次通知の本文が選択キャラに固定されないよう、保存済み設定に合わせて再同期する
    void syncDailyNotification();
    router.back();
  };

  const openPack = (packId: CharacterPackId) => {
    // 設定画面からは呼ばない。パック行タップ時のみ family_pack 等を渡す
    router.push({
      pathname: '/characters/[packId]',
      params: { packId },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>利用できるキャラクター</ThemedText>

          {availableCharacters.map((character) => {
            const isActive = selectedCharacterId === character.id;
            return (
              <Pressable
                key={character.id}
                onPress={() => void selectCharacter(character.id)}
                style={[styles.card, isActive && styles.cardActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Image source={character.image} style={styles.thumb} />
                <View style={styles.cardText}>
                  <ThemedText style={styles.cardTitle}>
                    {isActive ? '● ' : '○ '}
                    {character.name}
                  </ThemedText>
                  {!!character.description && (
                    <ThemedText style={styles.cardSub}>{character.description}</ThemedText>
                  )}
                  {isActive && (
                    <ThemedText style={styles.activeLabel}>現在選択中</ThemedText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>キャラクターパック</ThemedText>

          {shopPacks.map((pack) => {
            const owned = isPackOwned(pack.id);
            const count = pack.characterIds.length;
            const names = getPackCharacterNames(pack.id);

            return (
              <Pressable
                key={pack.id}
                onPress={() => openPack(pack.id)}
                style={styles.card}
                accessibilityRole="button"
              >
                <View style={styles.packBody}>
                  <ThemedText style={styles.cardTitle}>{pack.name}</ThemedText>
                  <ThemedText style={styles.cardSub}>{names}</ThemedText>
                  <ThemedText style={styles.cardMeta}>
                    {count}キャラクター
                  </ThemedText>
                  <View style={styles.packStatusRow}>
                    {!owned && (
                      <IconSymbol name="lock.fill" size={14} color={theme.icon} />
                    )}
                    <ThemedText style={styles.packStatus}>
                      {owned ? '購入済み' : '未購入'}
                    </ThemedText>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={20} color={theme.icon} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
    marginBottom: 10,
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
    minHeight: 72,
  },
  cardActive: {
    opacity: 1,
  },
  thumb: {
    width: 56,
    height: 56,
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
  cardMeta: {
    marginTop: 2,
    opacity: 0.65,
    fontSize: 12,
  },
  activeLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
  },
  packBody: {
    flex: 1,
    gap: 4,
  },
  packStatusRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packStatus: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
  },
});
