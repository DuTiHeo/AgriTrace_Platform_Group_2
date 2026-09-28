import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useReports, reviewLabel } from '@/contexts/report-context';
import { useAuth } from '@/contexts/auth-context';
import { getLogAuthor } from '@/sevices/farming-log.service';
import { Button, s } from './ui';
export function ReportReview({ id }: { id: string }) {
  const { getReport, reviewReport } = useReports();
  const { accessToken } = useAuth();
  const report = getReport(id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isWorkerLog, setIsWorkerLog] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setIsWorkerLog(false);
    if (accessToken && report?.workerId) {
      void getLogAuthor(accessToken, report.workerId)
        .then(author => { if (active) setIsWorkerLog(author.role === 'worker'); })
        .catch(() => { if (active) setError('Chưa xác minh được người ghi nhật ký để đánh giá.'); });
    }
    return () => { active = false; };
  }, [accessToken, report?.workerId]);
  if (!report || !isWorkerLog) return error ? <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text> : null;
  async function submit(value: 'passed' | 'rejected') {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError('');
    try { await reviewReport(id, value); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được đánh giá.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <Text style={s.section}>Đánh giá: {report.review ? reviewLabel(report) : 'Chưa đánh giá'}</Text>
    {!!report.reviewedBy && <Text style={s.muted}>Người đánh giá: {report.reviewedBy}</Text>}
    <Text style={s.muted}>Kết quả được lưu dưới dạng ghi chú đánh giá. Trạng thái nhiệm vụ không thay đổi.</Text>
    <View style={s.row}>
      <Button title="Đạt" disabled={busy || report.review === 'passed'} onPress={() => submit('passed')} />
      <Button title="Không đạt" danger disabled={busy || report.review === 'rejected'} onPress={() => submit('rejected')} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text>}
  </View>;
}
