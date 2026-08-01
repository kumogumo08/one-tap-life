import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value == null) return fallback;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Failed to read storage key: ${key}`, error);
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to write storage key: ${key}`, error);
    return false;
  }
}

export async function removeKey(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove storage key: ${key}`, error);
    return false;
  }
}
