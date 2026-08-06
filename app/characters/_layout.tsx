import { HeaderBackButton } from '@react-navigation/elements';
import { router, Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function CharactersLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'キャラクターを選択',
          headerBackTitle: '設定',
          // ネストStackの先頭画面は親へ戻る標準ボタンが出ないことがあるため明示
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              label={Platform.OS === 'ios' ? '設定' : undefined}
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <Stack.Screen
        name="[packId]"
        options={{
          title: 'キャラクターパック',
          headerBackTitle: '戻る',
        }}
      />
    </Stack>
  );
}
