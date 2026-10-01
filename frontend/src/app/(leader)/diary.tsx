import { getTaskTypeLabel } from '@/constants/task-types';
import { useCallback, useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useLeader } from "@/contexts/leader-context";
import { reviewLabel, useReports } from '@/contexts/report-context';
import { Avatar, Button, Card, Chip, dateText, Empty, go, Input, Screen, s } from "@/components/leader/ui";
import { Photos } from "@/components/leader/report-photos";
import { Comments } from "@/components/leader/diary-comments";
import { ReportReview } from '@/components/leader/report-review';
import { Feedback } from '@/components/leader/feedback';
import { inJournalPeriod, journalPeriods, type JournalPeriod } from '@/sevices/journal-filter';
import { AreaJournalFilter, JournalFilterOptions } from '@/components/common/season-journal-filter';

type ReviewFilter = 'all' | 'pending' | 'passed' | 'rejected';
const reviewFilters: { value: ReviewFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chưa đánh giá' },
  { value: 'passed', label: 'Đạt' },
  { value: 'rejected', label: 'Không đạt' },
];

export default function DiaryScreen() {
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  const { diaries } = useLeader();
  const { refresh, loadReport, ensureReportDetails, loading, error, getReport, selectedSeasonId } = useReports();
  const [targetError, setTargetError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    setTargetError('');
    if (reportId) void loadReport(reportId).catch(e => { if (active) setTargetError(e instanceof Error ? e.message : 'Không tải được nhật ký từ thông báo.'); });
    return () => { active = false; };
  }, [reportId, loadReport]));
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<JournalPeriod>('all');
  const [review, setReview] = useState<ReviewFilter>('all');
  const [limit, setLimit] = useState(10);
  useFocusEffect(useCallback(() => {
    if (reportId) return;
    const update = () => { void refresh({ skipIfFresh: true }); };
    update();
    const timer = setInterval(update, 15000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [refresh, reportId]));
  useEffect(() => { setLimit(10); }, [period, review, query, selectedSeasonId]);
  const filtered = diaries.filter(d => {
    if (reportId) return d.id === reportId;
    const result = getReport(d.id)?.review;
    return d.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
      && inJournalPeriod(d.time, period)
      && (review === 'all' || (review === 'pending' ? !result : result === review));
  });
  const visible = filtered.slice(0, limit);
  const visibleIds = visible.map(item => item.id).join('|');
  useEffect(() => { if (!loading && visibleIds) void ensureReportDetails(visibleIds.split('|')); }, [ensureReportDetails, visibleIds, loading]);
  return (
    <Screen title="Nhật ký canh tác" titleAction={<AreaJournalFilter allowAll />}>
      {!!reportId && <Button secondary title="Xem tất cả nhật ký" onPress={() => router.setParams({ reportId: '' })} />}
      {!!targetError && <Feedback text={targetError} />}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, zIndex: 15 }}>
        <View style={{ flex: 1 }}><JournalFilterOptions label="Thời gian" value={period} options={journalPeriods} onChange={setPeriod} /></View>
        <View style={{ flex: 1 }}><JournalFilterOptions label="Đánh giá" value={review} options={reviewFilters} onChange={setReview} alignRight /></View>
      </View>
      <Input label="Tìm công nhân" placeholder="Nhập tên công nhân…" value={query} onChangeText={setQuery} />
      {!!error && <Card><Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text><Button title="Thử tải lại" disabled={loading} onPress={() => { void refresh(); }} /></Card>}
      {!error && !visible.length && <Empty text="Không tìm thấy nhật ký phù hợp." />}
      {visible.map(d => (
        <Card key={d.id}>
          <View style={s.row}><Text style={[s.section, { flex: 1 }]}>{getTaskTypeLabel(d.title)}</Text><Chip text={reviewLabel(getReport(d.id) ?? {})} tone={getReport(d.id)?.review === 'rejected' ? 'danger' : 'green'} /></View>
          <View style={s.row}><Avatar name={d.name} small /><View><Text style={s.link}>{d.name}</Text><Text style={s.muted}>{d.area} · {dateText(d.time)}</Text></View></View>
          <Text style={{ color: '#617A68', fontSize: 13, lineHeight: 21 }}>{d.note}</Text>
          <Photos photos={d.photos} />
          <Button secondary title="Xem chi tiết nhật ký →" onPress={() => go('diary-detail', d.id)} />
          <ReportReview id={d.id} onReviewed={() => setReview('all')} />
          <Comments diary={d} />
        </Card>
      ))}
      {visible.length < filtered.length && <Button secondary title="Xem thêm nhật ký" onPress={() => setLimit(value => value + 10)} />}
      {!!filtered.length && visible.length === filtered.length && filtered.length > 10 && <Text style={s.muted}>Đã hiển thị toàn bộ nhật ký.</Text>}
    </Screen>
  );
}
