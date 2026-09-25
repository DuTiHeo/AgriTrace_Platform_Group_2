import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard, Pressable, RefreshControl, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/common/primary-button';
import { WorkerHeader } from '@/components/worker/worker-header';
import { ReportComments, ReportPhotos, s } from '@/components/worker/diary-content';
import { reviewLabel, useReports } from '@/contexts/report-context';
import { useAuth } from '@/contexts/auth-context';
import { colors } from '@/styles/theme';

export default function WorkerDiaryScreen() {
  const { reports, refresh, loading, error } = useReports();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const visible = reports.filter(report => `${report.taskTitle} ${report.area}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  return <SafeAreaView style={s.page} edges={['top']}>
    <WorkerHeader />
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void refresh(); }} />}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ gap: 16, flexGrow: 1 }}>
          <Text style={s.title}>Nhật ký canh tác</Text>
          <Text style={s.muted}>{reports.length} báo cáo của bạn</Text>
          <TextInput accessibilityLabel="Tìm nhật ký" style={s.input} placeholder="Tìm theo công việc hoặc khu vực…" value={query} onChangeText={setQuery} />
          {!!error && <View style={s.card}><Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text><PrimaryButton title="Thử tải lại" onPress={() => { void refresh(); }} /></View>}
          {!error && !visible.length && <View style={s.card}>
            <Text style={s.section}>{reports.length ? 'Không tìm thấy nhật ký phù hợp.' : 'Chưa có nhật ký'}</Text>
            {!reports.length && <><Text style={s.muted}>Ảnh và ghi chú của báo cáo bạn tạo sẽ xuất hiện tại đây.</Text><PrimaryButton title="Ghi nhật ký mới" onPress={() => { Keyboard.dismiss(); router.push('/(worker)/create-log' as Href); }} /></>}
          </View>}
          {visible.map(report => <View key={report.id} style={s.card}>
            <View style={s.row}><Text style={[s.section, { flex: 1 }]}>{report.taskTitle}</Text><Text style={[s.chip, report.review === 'rejected' && { color: colors.danger, backgroundColor: colors.dangerSoft }]}>{reviewLabel(report)}</Text></View>
            <Text style={s.label}>{report.workerName || user?.full_name || 'Bạn'}</Text>
            <Text style={s.muted}>{report.area} · {new Date(report.completedAt).toLocaleString('vi-VN')}</Text>
            <Text style={s.text}>{report.note || 'Không có ghi chú.'}</Text>
            <ReportPhotos photos={report.photos} />
            <Pressable style={s.linkButton} onPress={() => { Keyboard.dismiss(); router.push({ pathname: '/(worker)/diary-detail', params: { id: report.id } } as Href); }}><Text style={s.link}>Xem chi tiết nhật ký →</Text></Pressable>
            <ReportComments comments={report.comments} />
          </View>)}
        </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  </SafeAreaView>;
}
