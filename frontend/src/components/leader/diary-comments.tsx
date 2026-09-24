import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/contexts/auth-context";
import { useLeader, type Diary } from "@/contexts/leader-context";
import { Button, dateText, Input, s } from "./ui";

export function Comments({
  diary
}: {
  diary: Diary;
}) {
  const { addComment } = useLeader();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <View
      style={{
        gap: 12,
        borderTopWidth: 1,
        borderColor: '#EEF2ED',
        paddingTop: 14
      }}
    >
      <Text style={s.label}>
        Nhận xét của tổ trưởng · {diary.comments.length}
      </Text>

      {diary.comments.map((c, i) => (
        <View
          key={i}
          style={{
            padding: 12,
            backgroundColor: '#F0F7EF',
            borderRadius: 12,
            gap: 5
          }}
        >
          <Text style={s.link}>
            {c.name}
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: '#526B58',
              lineHeight: 20
            }}
          >
            {c.text}
          </Text>

          <Text style={s.muted}>
            {dateText(c.time)}
          </Text>
        </View>
      ))}

      <Input
        label="Thêm đánh giá"
        placeholder="Viết nhận xét về công việc…"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
      />

      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      <Button
        title="Gửi nhận xét"
        disabled={!text.trim() || saving}
        onPress={async () => {
          setSaving(true); setError('');
          try { await addComment(
            diary.id,
            text.trim(),
            user?.full_name ?? 'Tổ trưởng'
          );
          setText('');
          } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được nhận xét.'); }
          finally { setSaving(false); }
        }}
      />
    </View>
  );
}