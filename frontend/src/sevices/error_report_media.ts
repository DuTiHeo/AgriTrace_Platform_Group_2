import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { uploadErrorScreenshot } from './error_report.service';

export async function uploadErrorPhoto(token: string, uri: string) {
  const body = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    body.append('file', blob, 'error-screenshot.jpg');
  } else {
    body.append('file', new File(uri));
  }
  return uploadErrorScreenshot(token, body, expoFetch as typeof fetch);
}
