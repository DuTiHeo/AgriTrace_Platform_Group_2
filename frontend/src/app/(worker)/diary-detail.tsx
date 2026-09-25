import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReportComments, ReportPhotos, s } from '@/components/worker/diary-content';
import { reviewLabel, useReports } from '@/contexts/report-context';
import { useAuth } from '@/contexts/auth-context';
import { colors } from '@/styles/theme';

export default function WorkerDiaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getReport, loadReport } = useReports();
  const { user } = useAuth();
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => { setError(''); if (id) void loadReport(id).catch(e => setError(e instanceof Error ? e.message : 'Không tải được nhật ký.')); }, [id, loadReport]));
  const report = getReport(id);
  return <SafeAreaView style={s.page} edges={['top', 'bottom']}>
    <View style={s.header}>
      <Pressable hitSlop={12} accessibilityLabel="Quay lại" onPress={() => router.back()}><Text style={s.title}>←</Text></Pressable>
      <Text style={s.section}>Chi tiết nhật ký</Text>
    </View>
    <ScrollView contentContainerStyle={s.content}>
      {!!error && <View style={s.card}><Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text></View>}
      {report ? <>
        <View style={s.card}>
          <Text style={[s.chip, report.review === 'rejected' && { color: colors.danger, backgroundColor: colors.dangerSoft }]}>{reviewLabel(report)}</Text>
          <Text style={s.title}>{report.taskTitle}</Text>
          <Text style={s.muted}>Người thực hiện</Text><Text style={s.label}>{report.workerName || user?.full_name || 'Bạn'}</Text>
          <Text style={s.muted}>Khu vực</Text><Text style={s.label}>{report.area}</Text>
          <Text style={s.muted}>Vị trí GPS</Text><Text style={s.label}>{report.gps ? `${report.gps.latitude.toFixed(6)}, ${report.gps.longitude.toFixed(6)}` : 'Không có dữ liệu GPS'}</Text>
          <Text style={s.muted}>Thời gian báo cáo</Text><Text style={s.label}>{new Date(report.completedAt).toLocaleString('vi-VN')}</Text>
        </View>
        <View style={s.card}><Text style={s.section}>Nội dung công việc</Text><Text style={s.text}>{report.note || 'Không có ghi chú.'}</Text></View>
        <View style={s.card}><Text style={s.section}>Hình ảnh minh chứng ({report.photos.length})</Text><ReportPhotos photos={report.photos} /></View>
        <View style={s.card}><ReportComments comments={report.comments} /></View>
      </> : <View style={s.card}><Text style={s.muted}>Đang tải nhật ký…</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}
