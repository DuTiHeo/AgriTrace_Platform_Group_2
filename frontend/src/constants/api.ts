import { Platform } from 'react-native';

// Thiết bị thật: đặt EXPO_PUBLIC_API_BASE_URL thành địa chỉ IP LAN của máy backend.
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android' ? 'http://192.168.1.38:8000' : 'http://localhost:8000')
).replace(/\/+$/, '');
