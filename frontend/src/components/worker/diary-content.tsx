import { sharedStyles as shared } from '@/styles/role-styles';
import { StyleSheet, Text, View } from 'react-native';
import { ReportPhotos as SharedReportPhotos } from '@/components/common/report-photos';
import { type WorkReport } from '@/contexts/report-context';
import { noticeTime } from '@/contexts/notification-context';

export function ReportPhotos({ photos }: { photos: string[] }) {
  return <SharedReportPhotos photos={photos} emptyText="Chưa có ảnh minh chứng." labelPrefix="Xem toàn màn hình ảnh" />;
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
