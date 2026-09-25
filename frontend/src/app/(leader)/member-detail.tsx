import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Keyboard, Switch, Text, TextInput, View } from "react-native";
import { useLeader } from "@/contexts/leader-context";
import { Avatar, Button, Card, dateText, Empty, Input, Row, Screen, Section, s } from "@/components/leader/ui";
import { Feedback } from "@/components/leader/feedback";
import { useAuth } from "@/contexts/auth-context";
import { getMemberActivity } from "@/sevices/farming-log.service";

export default function MemberDetailScreen() {
    const { id } = useLocalSearchParams<{
        id: string;
    }>();
    const { members, updateMember } = useLeader();
    const { accessToken } = useAuth();
    const member = members.find(m => m.id === id);
    const [phone, setPhone] = useState(member?.phone ?? ''), [active, setActive] = useState(member?.active ?? true), [message, setMessage] = useState('');
    const phoneRef = useRef<TextInput>(null);
    const [activity, setActivity] = useState({ totalLogs: 0, completedTasks: 0 });
    const [activityLoading, setActivityLoading] = useState(true);
    const [activityError, setActivityError] = useState('');
    useEffect(() => { setPhone(member?.phone ?? ''); setActive(member?.active ?? true); setMessage(''); }, [id, member?.phone, member?.active]);
    useEffect(() => {
        let activeRequest = true;
        if (!accessToken || !id) return;
        setActivityLoading(true);
        setActivityError('');
        void getMemberActivity(accessToken, id)
            .then(result => { if (activeRequest) setActivity(result); })
            .catch(error => { if (activeRequest) setActivityError(error instanceof Error ? error.message : 'Không tải được thành tích thành viên.'); })
            .finally(() => { if (activeRequest) setActivityLoading(false); });
        return () => { activeRequest = false; };
    }, [accessToken, id]);
    function save() { if (!/^\+?\d{9,15}$/.test(phone.trim())) {
        setMessage('Số điện thoại phải gồm 9–15 chữ số.');
        phoneRef.current?.focus();
        return;
    } if (members.some(m => m.id !== id && m.phone === phone.trim())) {
        setMessage('Số điện thoại đã có trong tổ.');
        phoneRef.current?.focus();
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
            value={member.joined ? dateText(member.joined) : 'Chưa có dữ liệu'}
          />

          <Input
            ref={phoneRef}
            label="Số điện thoại"
            value={phone}
            onChangeText={value => { setPhone(value); if (/^\+?\d{9,15}$/.test(value.trim())) setMessage(''); }}
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
            label="Tổng số nhật ký đã tạo"
            value={activityLoading ? 'Đang tải…' : `${activity.totalLogs} nhật ký`}
          />

          <Row
            label="Tổng số công việc đã hoàn thành"
            value={activityLoading ? 'Đang tải…' : `${activity.completedTasks} công việc`}
          />
          <Feedback text={activityError} />
        </Card>
      </>
    ) : (
      <Empty text="Không tìm thấy thành viên." />
    )}
  </Screen>
);
}
