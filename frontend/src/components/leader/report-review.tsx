import { useState } from 'react';
import { Text, View } from 'react-native';
import { useReports, reviewLabel } from '@/contexts/report-context';
import { Button, s } from './ui';
export function ReportReview({ id }: { id: string }) {
  const { getReport, reviewReport, ready } = useReports();
  const report = getReport(id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!report) return null;
  async function submit(value: 'passed' | 'rejected') {
    if (busy) return;
    setBusy(true); setError('');
    try { await reviewReport(id, value); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được đánh giá.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <Text style={s.section}>Đánh giá: {reviewLabel(report)}</Text>
    {!!report.reviewedBy && <Text style={s.muted}>Người đánh giá: {report.reviewedBy}</Text>}
    {report.review === 'rejected' && <Text style={s.muted}>Công việc cần làm lại. Công nhân có thể chụp ảnh và gửi báo cáo mới.</Text>}
    <View style={s.row}>
      <Button title="Đạt" disabled={busy || !ready || report.review === 'passed'} onPress={() => submit('passed')} />
      <Button title="Không đạt" danger disabled={busy || !ready || report.review === 'rejected'} onPress={() => submit('rejected')} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text>}
  </View>;
}
