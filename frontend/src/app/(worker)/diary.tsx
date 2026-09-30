import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Pressable, RefreshControl, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/common/primary-button';
import { WorkerHeader } from '@/components/worker/worker-header';
import { ReportComments, ReportPhotos, s } from '@/components/worker/diary-content';
import { reviewLabel, useReports } from '@/contexts/report-context';
import { useAuth } from '@/contexts/auth-context';
import { colors } from '@/styles/theme';
import { inJournalPeriod, journalPeriods, type JournalPeriod } from '@/sevices/journal-filter';
import { AreaJournalFilter } from '@/components/common/season-journal-filter';

export default function WorkerDiaryScreen() {
  const { reports, refresh, ensureReportDetails, loading, error, selectedSeasonId, seasons, selectSeason } = useReports();
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const scrolledReport = useRef<string | null>(null);
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<JournalPeriod>('today');
  const [limit, setLimit] = useState(10);
  useFocusEffect(useCallback(() => {
    if (!reportId) return;
    scrolledReport.current = null;
    setPeriod('all'); setQuery(''); selectSeason('all');
  }, [reportId, selectSeason]));
  useFocusEffect(useCallback(() => {
    const update = () => { void refresh({ skipIfFresh: true }); };
    update();
    const timer = setInterval(update, 15000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [refresh]));
  useEffect(() => { setLimit(10); }, [period, query, selectedSeasonId]);
  const filtered = reports.filter(report => seasons.some(season => season.season_id === report.seasonId)
    && inJournalPeriod(report.completedAt, period)
    && `${report.taskTitle} ${report.area}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const targetIndex = filtered.findIndex(report => report.id === reportId);
  const visible = filtered.slice(0, Math.max(limit, targetIndex + 1));
  const visibleIds = visible.map(item => item.id).join('|');
  useEffect(() => { if (!loading && visibleIds) void ensureReportDetails(visibleIds.split('|')); }, [ensureReportDetails, visibleIds, loading]);
  return <SafeAreaView style={s.page} edges={['top']}>
    <WorkerHeader />
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void refresh(); }} />}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ gap: 16, flexGrow: 1 }}>
          <View style={[s.row, { alignItems: 'center', zIndex: 20 }]}>
            <Text style={[s.title, { flex: 1 }]}>Nhật ký canh tác</Text>
            <AreaJournalFilter allowAll />
          </View>
          <View style={[s.row, { gap: 6 }]}>
            {[...journalPeriods.filter(item => item.value !== 'all'), ...journalPeriods.filter(item => item.value === 'all')].map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: period === item.value }}
              onPress={() => setPeriod(item.value)} style={[s.linkButton, { borderRadius: 0, flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 2, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }, period === item.value && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
              <Text style={[period === item.value ? s.link : s.muted, { textAlign: 'center' }]}>{item.label}</Text>
            </Pressable>)}
          </View>
          <TextInput accessibilityLabel="Tìm nhật ký" style={s.input} placeholder="Tìm theo công việc hoặc khu vực…" value={query} onChangeText={setQuery} />
          {!!error && <View style={s.card}><Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text><PrimaryButton title="Thử tải lại" onPress={() => { void refresh(); }} /></View>}
          {!error && !visible.length && <View style={s.card}>
            <Text style={s.section}>{reports.length ? 'Không tìm thấy nhật ký phù hợp.' : 'Chưa có nhật ký'}</Text>
            {!reports.length && <><Text style={s.muted}>Ảnh và ghi chú của báo cáo bạn tạo sẽ xuất hiện tại đây.</Text><PrimaryButton title="Ghi nhật ký mới" onPress={() => { Keyboard.dismiss(); router.push('/(worker)/create-log' as Href); }} /></>}
          </View>}
          {visible.map(report => <View key={report.id}
            style={[s.card, report.id === reportId && { borderColor: colors.primary, borderWidth: 2 }]}
            onLayout={event => {
              if (report.id !== reportId || scrolledReport.current === reportId) return;
              const y = event.nativeEvent.layout.y;
              scrolledReport.current = reportId;
              requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: true }));
            }}>
            <View style={s.row}><Text style={[s.section, { flex: 1 }]}>{report.taskTitle}</Text><Text style={[s.chip, report.review === 'rejected' && { color: colors.danger, backgroundColor: colors.dangerSoft }]}>{reviewLabel(report)}</Text></View>
            <Text style={s.label}>{report.workerName || user?.full_name || 'Bạn'}</Text>
            <Text style={s.muted}>{report.area} · {new Date(report.completedAt).toLocaleString('vi-VN')}</Text>
            <Text style={s.text}>{report.note || 'Không có ghi chú.'}</Text>
            <ReportPhotos photos={report.photos} />
            <Pressable style={s.linkButton} onPress={() => { Keyboard.dismiss(); router.push({ pathname: '/(worker)/diary-detail', params: { id: report.id, fromNotification: 'false' } } as Href); }}><Text style={s.link}>Xem chi tiết nhật ký →</Text></Pressable>
            <ReportComments comments={report.comments} />
          </View>)}
          {visible.length < filtered.length && <PrimaryButton title="Xem thêm nhật ký" onPress={() => setLimit(value => value + 10)} />}
          {!!filtered.length && visible.length === filtered.length && filtered.length > 10 && <Text style={s.muted}>Đã hiển thị toàn bộ nhật ký.</Text>}
        </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  </SafeAreaView>;
}
