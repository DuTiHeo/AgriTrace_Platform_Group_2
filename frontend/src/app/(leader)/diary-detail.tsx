import { ReportReview } from '@/components/leader/report-review';
import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useLeader } from "@/contexts/leader-context";
import { useReports } from '@/contexts/report-context';
import { Card, Chip, Empty, Row, Screen, Section, s } from "@/components/leader/ui";
import { Photos } from "@/components/leader/report-photos";
import { Comments } from "@/components/leader/diary-comments";

export default function DiaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { diaries } = useLeader();
  const { loadReport } = useReports();
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => { setError(''); if (id) void loadReport(id).catch(e => setError(e instanceof Error ? e.message : 'Không tải được nhật ký.')); }, [id, loadReport]));
  const diary = diaries.find(d => d.id === id);
  return (
    <Screen title="Chi tiết nhật ký" back>
      {!!error && <Card><Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text></Card>}
      {diary ? (
        <>
          <Card>
            <Chip text="Báo cáo đã ghi nhận" />
            <Text style={s.title}>{diary.title}</Text>
            <Row label="Người thực hiện" value={diary.name} />
            <Row label="Khu vực" value={diary.area} />
            <Row label="Vị trí GPS" value={diary.gps ? `${diary.gps.latitude.toFixed(6)}, ${diary.gps.longitude.toFixed(6)}` : 'Không có dữ liệu GPS'} />
            <Row label="Thời gian báo cáo" value={new Date(diary.time).toLocaleString('vi-VN')} />
          </Card>
          <Card><Section title="Nội dung công việc" /><Text style={{ color: '#617A68', lineHeight: 23 }}>{diary.note || 'Không có ghi chú.'}</Text></Card>
          <Card><Section title={`Hình ảnh minh chứng (${diary.photos.length})`} /><Photos photos={diary.photos} /></Card>
          <Card><ReportReview id={diary.id} /><Comments diary={diary} /></Card>
        </>
      ) : <Empty text="Đang tải nhật ký…" />}
    </Screen>
  );
}
