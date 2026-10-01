import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { transcribeRecording } from '@/sevices/speech.service';

export type VoicePhase = 'idle' | 'preparing' | 'recording' | 'processing';
const MAX_SECONDS = 60;

function removeRecording(uri: string | null) {
  if (!uri) return;
  try {
    if (Platform.OS === 'web') URL.revokeObjectURL(uri);
    else { const file = new File(uri); if (file.exists) file.delete(); }
  } catch {}
}

export function useVoiceInput(token: string | null, scope: string, onText: (text: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [error, setError] = useState('');
  const phaseRef = useRef<VoicePhase>('idle');
  const generation = useRef(0);
  const active = useRef(false);
  const operation = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const callback = useRef(onText);
  useEffect(() => { callback.current = onText; }, [onText]);
  const transition = useCallback((next: VoicePhase) => { phaseRef.current = next; setPhase(next); }, []);

  const cancel = useCallback(() => {
    generation.current += 1;
    controller.current?.abort();
    if (!operation.current) {
      operation.current = true;
      void (async () => {
        try { if (phaseRef.current === 'recording') await recorder.stop(); }
        catch {}
        finally {
          removeRecording(recorder.uri);
          await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
          operation.current = false;
          transition('idle');
        }
      })();
    }
  }, [recorder, transition]);

  useFocusEffect(useCallback(() => {
    if (!token || !scope) return;
    active.current = true;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' || (state === 'inactive' && phaseRef.current !== 'preparing')) {
        active.current = false; cancel();
      } else if (state === 'active') active.current = true;
    });
    return () => { active.current = false; subscription.remove(); cancel(); };
  }, [cancel, token, scope]));

  const start = useCallback(async () => {
    if (operation.current || phaseRef.current !== 'idle' || !active.current) return;
    operation.current = true;
    const id = ++generation.current;
    let started = false;
    transition('preparing'); setError('');
    try {
      if (!token) throw new Error('Vui lòng đăng nhập lại.');
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (id !== generation.current || !active.current) return;
      if (!permission.granted) throw new Error('Vui lòng cho phép microphone trong cài đặt điện thoại để thu âm.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false });
      if (id !== generation.current || !active.current) return;
      await recorder.prepareToRecordAsync();
      if (id !== generation.current || !active.current) { await recorder.stop(); return; }
      recorder.record();
      started = true;
      transition('recording');
    } catch (e) {
      if (active.current && id === generation.current) setError(e instanceof Error ? e.message : 'Không mở được microphone.');
    } finally {
      if (!started || id !== generation.current) {
        if (started) await recorder.stop().catch(() => undefined);
        removeRecording(recorder.uri);
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
        transition('idle');
      }
      operation.current = false;
    }
  }, [recorder, token, transition]);

  const finish = useCallback(async () => {
    if (operation.current || phaseRef.current !== 'recording') return;
    operation.current = true;
    const id = generation.current;
    transition('processing');
    let uri: string | null = null;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 100000);
    try {
      await recorder.stop();
      uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false });
      if (id !== generation.current || !active.current) return;
      if (!uri) throw new Error('Không có bản ghi âm. Vui lòng thử lại.');
      if (!token) throw new Error('Vui lòng đăng nhập lại.');
      const text = await transcribeRecording(token, uri, abort.signal);
      if (active.current && id === generation.current) callback.current(text);
    } catch (e) {
      if (active.current && id === generation.current) setError(abort.signal.aborted
        ? 'Chuyển giọng nói quá lâu. Vui lòng kiểm tra mạng và thử lại.'
        : e instanceof Error && !/network|fetch/i.test(e.message) ? e.message : 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.');
    } finally {
      clearTimeout(timeout); controller.current = null;
      removeRecording(uri ?? recorder.uri);
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      operation.current = false; transition('idle');
    }
  }, [recorder, token, transition]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = setTimeout(() => { void finish(); }, MAX_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [phase, finish]);

  return { phase, error, seconds: Math.min(MAX_SECONDS, Math.floor(recorderState.durationMillis / 1000)),
    busy: phase !== 'idle', toggle: () => phaseRef.current === 'recording' ? finish() : start() };
}
