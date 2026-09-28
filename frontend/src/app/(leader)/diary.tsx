import { ReportReview } from '@/components/leader/report-review';
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from 'expo-router';
import { useLeader } from "@/contexts/leader-context";
import { useReports } from '@/contexts/report-context';
import { Avatar, Button, Card, Chip, dateText, Empty, go, Input, Screen, s } from "@/components/leader/ui";
import { Photos } from "@/components/leader/report-photos";
import { Comments } from "@/components/leader/diary-comments";
import { colors } from '@/styles/theme';
import { inJournalPeriod, journalPeriods, type JournalPeriod } from '@/sevices/journal-filter';

type ReviewFilter = 'all' | 'pending' | 'passed' | 'rejected';
const reviewFilters: { value: ReviewFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chưa đánh giá' },
  { value: 'passed', label: 'Đạt' },
  { value: 'rejected', label: 'Không đạt' },
];

export default function DiaryScreen() {
  const { diaries } = useLeader();
  const { refresh, loading, error, getReport } = useReports();
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<JournalPeriod>('all');
  const [review, setReview] = useState<ReviewFilter>('all');
  const [limit, setLimit] = useState(10);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => { setLimit(10); }, [period, review, query]);
  const filtered = diaries.filter(d => {
    const result = getReport(d.id)?.review;
    return d.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
      && inJournalPeriod(d.time, period)
      && (review === 'all' || (review === 'pending' ? !result : result === review));
  });
  const visible = filtered.slice(0, limit);
  return (
    <Screen title="Nhật ký canh tác">
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {journalPeriods.map(item => <Pressable key={item.value} onPress={() => setPeriod(item.value)}
          style={[s.secondary, { paddingHorizontal: 11, paddingVertical: 8 }, period === item.value && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Text style={period === item.value ? s.link : s.muted}>{item.label}</Text>
        </Pressable>)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.row, { paddingRight: 12 }]}>
        {reviewFilters.map(item => <Pressable key={item.value} onPress={() => setReview(item.value)}
          style={[s.secondary, { paddingHorizontal: 11, paddingVertical: 8 }, review === item.value && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Text style={review === item.value ? s.link : s.muted}>{item.label}</Text>
        </Pressable>)}
      </ScrollView>
      <Input label="Tìm công nhân" placeholder="Nhập tên công nhân…" value={query} onChangeText={setQuery} />
      {!!error && <Card><Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text><Button title="Thử tải lại" disabled={loading} onPress={() => { void refresh(); }} /></Card>}
      {!error && !visible.length && <Empty text="Không tìm thấy nhật ký phù hợp." />}
      {visible.map(d => (
        <Card key={d.id}>
          <View style={s.row}><Text style={[s.section, { flex: 1 }]}>{d.title}</Text><Chip text="Đã ghi nhận" /></View>
          <View style={s.row}><Avatar name={d.name} small /><View><Text style={s.link}>{d.name}</Text><Text style={s.muted}>{d.area} · {dateText(d.time)}</Text></View></View>
          <Text style={{ color: '#617A68', fontSize: 13, lineHeight: 21 }}>{d.note}</Text>
          <Photos photos={d.photos} />
          <Button secondary title="Xem chi tiết nhật ký →" onPress={() => go('diary-detail', d.id)} />
          <ReportReview id={d.id} />
          <Comments diary={d} />
        </Card>
      ))}
      {visible.length < filtered.length && <Button secondary title="Xem thêm nhật ký" onPress={() => setLimit(value => value + 10)} />}
      {!!filtered.length && visible.length === filtered.length && filtered.length > 10 && <Text style={s.muted}>Đã hiển thị toàn bộ nhật ký.</Text>}
    </Screen>
  );
}
