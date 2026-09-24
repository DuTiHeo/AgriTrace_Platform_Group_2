import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLeader, blankDraft } from "@/contexts/leader-context";
import {
  Avatar,
  Button,
  Card,
  Chip,
  dateText,
  go,
  Screen,
  Section,
  s,
  Status
} from "@/components/leader/ui";

export default function HomeScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { members, tasks, diaries, draft, setDraft } = useLeader();
  const ownerTasks = tasks.filter(t => t.owner && (!taskId || t.id === taskId));
  const active = members.filter(m => m.active);

  const stats = [
    {
      n: active.length,
      label: 'Đang hoạt động',
      sub: `${members.length} thành viên`,
      path: 'members'
    },
    {
      n: diaries.filter(
        d => new Date(d.time).toDateString() === new Date().toDateString()
      ).length,
      label: 'Nhật ký hôm nay',
      sub: 'Cập nhật từ tổ',
      path: 'diary'
    },
    {
      n: tasks.filter(t => t.status !== 'done').length,
      label: 'Việc cần làm',
      sub: 'Đang theo dõi',
      path: 'assignments'
    },
    {
      n: tasks.filter(t => t.status === 'done').length,
      label: 'Đã hoàn thành',
      sub: 'Trong danh sách',
      path: 'assignments'
    }
  ];

  return (
    <Screen>
      {!!taskId && <Card><Text style={s.section}>Công việc từ thông báo</Text><Text style={s.muted}>{ownerTasks[0]?.title ?? 'Công việc không còn trong danh sách.'}</Text><Button secondary title="Xem tất cả công việc" onPress={() => router.setParams({ taskId: '' })} /></Card>}
      <View>
        <Text style={s.title}>
          Một ngày làm việc tốt lành 🌱
        </Text>

        <Text style={[s.muted, { marginTop: 6 }]}>
          Theo dõi công việc, đồng hành cùng tổ của bạn.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {stats.map(x => (
          <Pressable
            key={x.label}
            onPress={() => go(x.path)}
            style={[s.statCard, { width: 132 }]}
          >
            <Text style={s.muted}>
              {x.label}
            </Text>

            <Text
              style={s.statNumber}
            >
              {x.n}
            </Text>

            <Text style={[s.muted, { fontSize: 10 }]}>
              {x.sub}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => go('capture')}
        style={{
          backgroundColor: '#E4F0DE',
          borderRadius: 20,
          padding: 19,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            backgroundColor: '#FFF',
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text style={{ fontSize: 27 }}>
            📷
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.section}>
            {draft.photos.length
              ? `Tiếp tục bản nháp · ${draft.photos.length} ảnh`
              : 'Chụp ảnh & ghi nhật ký'}
          </Text>

          <Text style={s.muted}>
            Ghi nhận công việc bất cứ lúc nào
          </Text>
        </View>

        <Text style={s.link}>
          →
        </Text>
      </Pressable>

      <Section title="Công việc chủ nông trại giao" />

      {ownerTasks.map(t => (
        <Card key={t.id}>
          <View style={s.row}>
            <Chip text="TỪ CHỦ NÔNG TRẠI" />

            <View style={{ flex: 1 }} />

            <Status status={t.status} />
          </View>

          <Text style={s.section}>
            {t.title}
          </Text>

          <Text style={s.muted}>
            {t.area} · Hạn {dateText(t.due)}
          </Text>

          <Text
            style={{
              color: '#667C6D',
              fontSize: 13,
              lineHeight: 20
            }}
          >
            {t.instructions}
          </Text>

          {t.status !== 'done' && (
            <Button
              title={
                draft.photos.length
                  ? 'Tiếp tục bản nháp hiện tại'
                  : 'Chụp ảnh báo cáo'
              }
              onPress={() => {
                if (!draft.photos.length)
                  setDraft({
                    ...blankDraft(),
                    title: t.title,
                    area: t.area,
                    taskId: t.id
                  });

                go('capture');
              }}
            />
          )}
        </Card>
      ))}

      <Section
        title="Công nhân đang hoạt động"
        action="Tất cả →"
        onPress={() => go('members')}
      />

      <Card>
        {active.map(m => (
          <Pressable
            key={m.id}
            onPress={() => go('member-detail', m.id)}
            style={[
              s.row,
              {
                paddingVertical: 6
              }
            ]}
          >
            <Avatar name={m.name} />

            <View style={{ flex: 1 }}>
              <Text style={s.name}>
                {m.name}
              </Text>

              <Text style={s.muted}>
                {m.area}
              </Text>
            </View>

            <View
              style={{
                width: 7,
                height: 7,
                backgroundColor: '#55A467',
                borderRadius: 4
              }}
            />

            <Text style={s.link}>
              ›
            </Text>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}