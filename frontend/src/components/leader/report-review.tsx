import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useReports } from '@/contexts/report-context';
import { useAuth } from '@/contexts/auth-context';
import { getLogAuthor } from '@/sevices/farming-log.service';
import { Button, s } from './ui';
import { useScopedState } from '@/hooks/use-scoped-state';

export function ReportReview({ id, onReviewed }: {
  id: string;
  onReviewed?: () => void
}) {
  const { getReport, reviewReport } = useReports();
  const { accessToken } = useAuth();
  const report = getReport(id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isWorkerLog, setIsWorkerLog] = useScopedState(false, JSON.stringify([accessToken, report?.workerId]));
  const pending = useRef(false);
  useEffect(() => {
    let active = true;

    if (accessToken && report?.workerId) {
      void getLogAuthor(accessToken, report.workerId)
        .then(author => {
          if (active)
            setIsWorkerLog(author.role === 'worker');
        })
        .catch(() => {
          if (active)
            setError('Chưa xác minh được người ghi nhật ký để đánh giá.');
        });
    }

    return () => {
      active = false;
    };
  }, [
    accessToken,
    report?.workerId,
    setIsWorkerLog
  ]);

  if (!report || !isWorkerLog)
    return error ? <Text
      accessibilityRole="alert"
      style={{
        color: '#B42318'
      }}
    >
      {error}
    </Text> : null;

  async function submit(value: 'passed' | 'rejected') {
    if (pending.current)
      return;

    pending.current = true;
    setBusy(true);
    setError('');

    try {
      await reviewReport(id, value);
      onReviewed?.();
    }
    catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được đánh giá.');
    }
    finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <View style={[
    s.row,
    {
      flexWrap: 'wrap',
      alignItems: 'center'
    }
  ]}>
    <Text style={[
      s.section,
      {
        flex: 1,
        minWidth: 150
      }
    ]}>Nhận xét từ tổ trưởng</Text>
    <View style={[
      s.row,
      {
        flexWrap: 'wrap'
      }
    ]}>
      <Button
        title="Đạt"
        disabled={busy || report.review === 'passed'}
        onPress={() => submit('passed')}
      />
      <Button
        title="Không đạt"
        danger
        disabled={busy || report.review === 'rejected'}
        onPress={() => submit('rejected')}
      />
    </View>
    {!!error && <Text
      accessibilityRole="alert"
      style={{
        color: '#B42318'
      }}
    >
      {error}
    </Text>}
  </View>;
}
