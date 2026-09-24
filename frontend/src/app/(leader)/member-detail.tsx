import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Keyboard, Switch, Text, View } from "react-native";
import { useLeader } from "@/contexts/leader-context";
import { Avatar, Button, Card, dateText, Empty, Input, Row, Screen, Section, s, Status } from "@/components/leader/ui";
import { Feedback } from "@/components/leader/feedback";

export default function MemberDetailScreen() {
    const { id } = useLocalSearchParams<{
        id: string;
    }>();
    const { members, tasks, diaries, updateMember } = useLeader();
    const member = members.find(m => m.id === id);
    const [phone, setPhone] = useState(member?.phone ?? ''), [active, setActive] = useState(member?.active ?? true), [message, setMessage] = useState('');
    useEffect(() => { setPhone(member?.phone ?? ''); setActive(member?.active ?? true); setMessage(''); }, [id, member?.phone, member?.active]);
    const work = tasks.filter(t => t.memberIds.includes(id));
    const logs = diaries.filter(d => d.memberId === id);
    function save() { if (!/^\+?\d{9,15}$/.test(phone.trim())) {
        setMessage('Số điện thoại phải gồm 9–15 chữ số.');
        return;
    } if (members.some(m => m.id !== id && m.phone === phone.trim())) {
        setMessage('Số điện thoại đã có trong tổ.');
        return;
    } updateMember(id, phone.trim(), active);
setMessage('Đã lưu thay đổi.');
}

return (
  <Screen title="Chỉnh sửa thành viên" back>
    {member ? (
      <>
        <Card>
          <View style={s.row}>
            <Avatar name={member.name} />

            <View>
              <Text style={s.section}>
                {member.name}
              </Text>

              <Text style={s.muted}>
                Công nhân · {member.area}
              </Text>
            </View>
          </View>

          <Row
            label="Ngày tham gia"
            value={dateText(member.joined)}
          />

          <Input
            label="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>
                Tài khoản hoạt động
              </Text>

              <Text style={s.muted}>
                Tắt để khóa tài khoản
              </Text>
            </View>

            <Switch
              value={active}
              onValueChange={v => {
                Keyboard.dismiss();
                setActive(v);
              }}
              trackColor={{ true: '#72AF78' }}
            />
          </View>

          <Feedback text={message} />

          <Button
            title="Lưu thông tin"
            onPress={save}
          />
        </Card>

        <Section title="Thành tích & hoạt động" />

        <Card>
          <Row
            label="Công việc hoàn thành"
            value={`${work.filter(t => t.status === 'done').length} / ${work.length}`}
          />

          <Row
            label="Nhật ký đã đăng"
            value={`${logs.length} nhật ký`}
          />

          <Row
            label="Ảnh minh chứng"
            value={`${logs.reduce((sum, d) => sum + d.photos.length, 0)} ảnh`}
          />
        </Card>

        {work.map(t => (
          <Card key={t.id}>
            <Text style={s.section}>
              {t.title}
            </Text>

            <Text style={s.muted}>
              {t.area} · Hạn {dateText(t.due)}
            </Text>

            <Status status={t.status} />
          </Card>
        ))}
      </>
    ) : (
      <Empty text="Không tìm thấy thành viên." />
    )}
  </Screen>
);
}
