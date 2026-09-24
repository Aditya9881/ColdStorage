import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('Error reading from storage:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error('Error writing to storage:', e);
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('Error deleting from storage:', e);
    }
  },
};
