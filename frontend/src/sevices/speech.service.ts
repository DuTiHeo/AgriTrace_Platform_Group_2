import { API_BASE_URL } from '@/constants/api';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

export async function transcribeRecording(token: string, uri: string, signal: AbortSignal): Promise<string> {
  if (!token) throw new Error('Vui lòng đăng nhập lại.');
  const form = new FormData();
  if (Platform.OS === 'web') {
    const audio = await fetch(uri, { signal }).then(response => response.blob());
    const extension = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('wav') ? 'wav' : 'webm';
    form.append('file', audio, `recording.${extension}`);
  } else {
    form.append('file', new File(uri));
  }
  const response = await expoFetch(`${API_BASE_URL}/speech/transcribe`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    if (response.status === 429) throw new Error('Bạn thu âm quá nhiều lần. Vui lòng đợi một phút.');
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'Không chuyển được giọng nói. Vui lòng thử lại.');
  }
  if (typeof body?.text !== 'string' || !body.text.trim()) throw new Error('Không nhận được lời nói. Vui lòng thu âm lại.');
  return body.text.trim();
}
