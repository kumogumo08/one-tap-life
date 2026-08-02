import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_CHARACTER_ID, getCharacterById, isCharacterId } from '@/src/data/characters';
import type { CharacterId } from '@/src/types/character';

type Props = {
  characterId: CharacterId;
  message: string;
};

export default function PraiseCharacter({ characterId, message }: Props) {
  const safeId = isCharacterId(characterId) ? characterId : DEFAULT_CHARACTER_ID;
  const character = getCharacterById(safeId);

  return (
    <View pointerEvents="none" style={styles.layer}>
      {/* 左上：吹き出し */}
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{message}</Text>
      </View>

      {/* 右下：キャラ */}
      <Image source={character.image} style={styles.character} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    width: '100%',
    height: 260,
    position: 'relative',
  },

  bubble: {
    position: 'absolute',
    left: 14,
    bottom: 140,
    maxWidth: '72%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },

  character: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 175,
    height: 175,
    resizeMode: 'contain',
  },
});
