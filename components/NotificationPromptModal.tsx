import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  visible: boolean;
  busy?: boolean;
  onEnable: () => void;
  onSkip: () => void;
};

export default function NotificationPromptModal({
  visible,
  busy = false,
  onEnable,
  onSkip,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const modalBackground = isDark ? '#1C1C1E' : '#F7FAFC';
  const modalText = isDark ? Colors.dark.text : '#5C7EA6';
  const modalOverlay = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)';
  const modalCardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'transparent';
  const modalCloseBg = isDark ? '#2C3136' : Colors.light.tint;
  const modalCloseBorder = isDark ? '#687076' : 'transparent';
  const modalCloseText = isDark ? Colors.dark.text : '#fff';
  const skipBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(92, 126, 166, 0.35)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onSkip}
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: modalOverlay }]}
          onPress={busy ? undefined : onSkip}
          accessibilityRole="button"
          accessibilityLabel="今はしない"
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: modalBackground,
              borderColor: modalCardBorder,
            },
          ]}
        >
          <ThemedText style={[styles.title, { color: modalText }]}>
            明日も続けますか？
          </ThemedText>
          <ThemedText style={[styles.body, { color: modalText }]}>
            忘れないように、毎日20:00にお知らせできます。
          </ThemedText>

          <Pressable
            onPress={busy ? undefined : onEnable}
            disabled={busy}
            style={[
              styles.primaryBtn,
              { backgroundColor: modalCloseBg, borderColor: modalCloseBorder },
              busy && styles.btnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
          >
            <ThemedText style={[styles.primaryText, { color: modalCloseText }]}>
              通知を設定する
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={busy ? undefined : onSkip}
            disabled={busy}
            style={[styles.skipBtn, { borderColor: skipBorder }, busy && styles.btnDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
          >
            <ThemedText style={[styles.skipText, { color: modalText }]}>今はしない</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    zIndex: 1,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.95,
    marginBottom: 8,
  },
  primaryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '700',
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
