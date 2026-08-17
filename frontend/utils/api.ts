import Constants from 'expo-constants';

const rawUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  Constants.expoConfig?.extra?.EXPO_BACKEND_URL ||
  'http://localhost:8000';

export const API_BASE_URL = rawUrl.replace(/\/+$/, '');
export const API_URL = `${API_BASE_URL}/api`;

export default API_URL;
