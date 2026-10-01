import { sharedStyles as shared } from '@/styles/role-styles';
import { useState } from 'react';
import { Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FullScreenImageViewer } from '@/components/common/full-screen-image-viewer';
import { type WorkReport } from '@/contexts/report-context';
import { noticeTime } from '@/contexts/notification-context';

export function ReportPhotos({ photos }: {
  photos: string[]
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return <>
    {photos.length ? <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.photos}
    >
      {photos.map((uri, index) => <Pressable
        key={`${uri}-${index}`}
        accessibilityLabel={`Xem toàn màn hình ảnh ${index + 1}`}
        onPress={() => {
          Keyboard.dismiss();
          setSelected(uri);
        }}
      >
        <Image
          source={{
            uri
          }}
          style={s.photo}
        />
      </Pressable>)}
    </ScrollView> : <Text style={s.muted}>Chưa có ảnh minh chứng.</Text>}
    <FullScreenImageViewer
      uri={selected}
      onClose={() => setSelected(null)}
    />
  </>;
}

// Worker chỉ đọc nhận xét; không có ô nhập hoặc thao tác gửi/sửa/xóa.

export function ReportComments({ comments = [] }: {
  comments?: WorkReport['comments']
}) {
  const remarks = comments.filter(comment => ![
    'Đánh giá: Đạt',
    'Đánh giá: Không đạt'
  ].includes(comment.text))
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

  return <View style={[
    s.comment,
    {
      gap: 10
    }
  ]}>
    <Text style={s.section}>Nhận xét từ tổ trưởng</Text>
    {remarks.length ? remarks.map(comment => <View
      key={comment.id}
      style={{
        gap: 5,
        paddingTop: 4
      }}
    >
      <Text style={s.label}>
        {comment.author}
      </Text>
      <Text style={s.muted}>
        {noticeTime(comment.time)}
      </Text>
      <Text style={s.text}>
        {comment.text}
      </Text>
    </View>) : <Text style={s.muted}>Chưa có nhận xét từ tổ trưởng.</Text>}
  </View>;
}

export const s = StyleSheet.create({
  page: {
    ...shared.page
  },
  content: {
    ...shared.content,
    flexGrow: 1
  },
  card: {
    ...shared.card
  },
  title: {
    ...shared.title
  },
  section: {
    ...shared.section
  },
  label: {
    ...shared.label
  },
  muted: {
    ...shared.muted
  },
  text: {
    ...shared.body
  },
  chip: {
    ...shared.chip,
    ...shared.chipText
  },
  row: {
    ...shared.row
  },
  input: {
    ...shared.input
  },
  photos: {
    ...shared.photoList
  },
  photo: {
    ...shared.photo
  },
  comment: {
    ...shared.secondary,
    padding: 12,
    borderRadius: 0,
    gap: 5
  },
  linkButton: {
    ...shared.button,
    ...shared.secondary
  },
  link: {
    ...shared.link
  },
  header: {
    ...shared.header
  },
});
