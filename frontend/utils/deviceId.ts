import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'elder_device_id';

/**
 * Generates a standard RFC4122 v4 UUID
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets or initializes a persistent unique device ID for anonymous user features.
 */
export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      let storedId = localStorage.getItem(DEVICE_ID_KEY);
      if (!storedId) {
        storedId = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, storedId);
      }
      return storedId;
    }

    let storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!storedId) {
      storedId = generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, storedId);
    }
    return storedId;
  } catch (error) {
    console.warn('Failed to read deviceId from storage, falling back to ephemeral ID:', error);
    return generateUUID();
  }
}
