import { useFinishTabFlow } from '@/hooks/use-finish-tab-flow';
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/contexts/auth-context";
import { useLeader } from "@/contexts/leader-context";
import {
  Button,
  Card,
  Chip,
  Input,
  Screen,
  Section,
  s
} from "@/components/leader/ui";
import { Feedback } from "@/components/leader/feedback";
import { AreaPicker } from "@/components/leader/area-picker";
import { Photos } from "@/components/leader/report-photos";

export default function CaptureScreen() {
  const finishTabFlow = useFinishTabFlow();
  const { draft, setDraft, postDraft } = useLeader();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pending = useRef(false);

  async function capture() {
    if (pending.current)
      return;

    pending.current = true;
    setBusy(true);
    setError('');

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setError(
          'Vui lòng cho phép truy cập camera trong cài đặt điện thoại.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.75,
        allowsEditing: false
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;

        setDraft(old => ({
          ...old,
          photos: [...old.photos, uri].slice(0, 5)
        }));
      }
    }
    catch {
      setError(
        'Không mở được camera. Vui lòng kiểm tra quyền hoặc dùng thiết bị có camera.'
      );
    }
    finally {
      setBusy(false);
      pending.current = false;
    }
  }

  return (
    <Screen title="Chụp ảnh & ghi nhật ký" back>
      <Card>
        <Chip text="BẢN NHÁP · CHƯA GỬI" />

        <Text style={s.muted}>
          Ảnh và ghi chú được giữ khi chuyển màn hình trong phiên hiện tại.
          Cần ít nhất 2 ảnh để đăng nhật ký.
        </Text>

        <Input
          label="Tên công việc *"
          placeholder="Bạn vừa thực hiện công việc gì?"
          value={draft.title}
          maxLength={100}
          onChangeText={title =>
            setDraft(old => ({
              ...old,
              title
            }))
          }
        />

        <AreaPicker
          value={draft.area}
          onChange={area =>
            setDraft(old => ({
              ...old,
              area
            }))
          }
        />

        <Input
          label="Ghi chú"
          placeholder="Mô tả kết quả và những điều cần lưu ý…"
          multiline
          value={draft.note}
          onChangeText={note =>
            setDraft(old => ({
              ...old,
              note
            }))
          }
        />
      </Card>

      <Card>
        <Section title={`Ảnh minh chứng · ${draft.photos.length}/5`} />

        <Photos photos={draft.photos} />

        {draft.photos.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            {draft.photos.map((_, i) => (
              <Button
                key={i}
                secondary
                title={`Xóa ảnh ${i + 1}`}
                onPress={() =>
                  setDraft(old => ({
                    ...old,
                    photos: old.photos.filter((__, j) => j !== i)
                  }))
                }
              />
            ))}
          </View>
        )}

        <Button
          secondary
          title={busy ? 'Đang mở camera…' : '📷  Chụp ảnh'}
          disabled={busy || draft.photos.length >= 5}
          onPress={capture}
        />

        <Text style={s.muted}>
          {draft.photos.length < 2
            ? `Chụp thêm ${2 - draft.photos.length} ảnh để có thể đăng.`
            : 'Đã đủ ảnh. Bạn có thể chụp thêm hoặc đăng nhật ký.'}
        </Text>

        <Feedback text={error} />
      </Card>

      <Button
        title="Đăng nhật ký"
        disabled={
          busy ||
          draft.photos.length < 2 ||
          !draft.title.trim()
        }
        onPress={() => {
          postDraft(user?.full_name ?? 'Tổ trưởng');
          finishTabFlow('diary');
        }}
      />
    </Screen>
  );
}