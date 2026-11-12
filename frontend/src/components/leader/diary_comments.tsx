import type { ComponentRef } from 'react';
import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useLeader, type Diary } from "@/contexts/leader_context";
import { Button, dateText, Input, s } from "./ui";
import { colors, radius } from '@/styles/theme';

export function Comments({
  diary
}: {
  diary: Diary;
}) {
  const { addComment } = useLeader();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  return (
    <View style={{ marginTop: 12 }}>
      {diary.comments.map(c => (
        <View
          key={c.id}
          style={{
            padding: 12,
            backgroundColor: colors.successSoft,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.control,
            marginBottom: 12,
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

      <View style={{ gap: 12 }}>
        <Input
          ref={inputRef}
          label="Viết nhận xét"
          placeholder="Viết nhận xét về công việc…"
          value={text}
          onChangeText={value => {
            setText(value);

            if (value.trim())
              setError('');
          }}
          multiline
          maxLength={1000}
        />

        {!!error && <Text accessibilityRole="alert">
          {error}
        </Text>}
        <Button
          title="Gửi nhận xét"
          disabled={saving}
          onPress={async () => {
            if (!text.trim()) {
              setError('Vui lòng nhập nhận xét.');
              inputRef.current?.focus();

              return;
            }

            setSaving(true);
            setError('');

            try {
              await addComment(
                diary.id,
                text.trim()
              );
              setText('');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Không lưu được nhận xét.');
            }
            finally {
              setSaving(false);
            }
          }}
        />
      </View>
    </View>
  );
}
