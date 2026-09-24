import { ReportReview } from '@/components/leader/report-review';
import { useState } from "react";
import { Text, View } from "react-native";
import { useLeader } from "@/contexts/leader-context";
import {
  Avatar,
  Button,
  Card,
  Chip,
  dateText,
  Empty,
  go,
  Input,
  Screen,
  s
} from "@/components/leader/ui";
import { Photos } from "@/components/leader/report-photos";
import { Comments } from "@/components/leader/diary-comments";

export default function DiaryScreen() {
  const { diaries } = useLeader();
  const [query, setQuery] = useState('');

  const visible = diaries.filter(d =>
    d.name
      .toLocaleLowerCase('vi')
      .includes(query.toLocaleLowerCase('vi'))
  );

  return (
    <Screen title="Nhật ký canh tác">
      <Text style={s.muted}>
        {diaries.length} nhật ký từ tổ của bạn
      </Text>

      <Input
        label="Tìm công nhân"
        placeholder="Nhập tên công nhân…"
        value={query}
        onChangeText={setQuery}
      />

      {!visible.length && (
        <Empty text="Không tìm thấy nhật ký phù hợp." />
      )}

      {visible.map(d => (
        <Card key={d.id}>
          <View style={s.row}>
            <Text style={[s.section, { flex: 1 }]}>
              {d.title}
            </Text>

            <Chip text="Đã ghi nhận" />
          </View>

          <View style={s.row}>
            <Avatar
              name={d.name}
              small
            />

            <View>
              <Text style={s.link}>
                {d.name}
              </Text>

              <Text style={s.muted}>
                {d.area} · {dateText(d.time)}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: '#617A68',
              fontSize: 13,
              lineHeight: 21
            }}
          >
            {d.note}
          </Text>

          <Photos photos={d.photos} />

          <Button
            secondary
            title="Xem chi tiết nhật ký →"
            onPress={() => go('diary-detail', d.id)}
          />

          <ReportReview id={d.id} />
          <Comments diary={d} />
        </Card>
      ))}
    </Screen>
  );
}