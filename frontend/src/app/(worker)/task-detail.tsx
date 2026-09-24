import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WorkerTaskDetailScreen() {
  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Chi tiết công việc
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={shared.card}>
        <Text style={styles.status}>
          Đang làm
        </Text>

        <Text style={styles.title}>
          Kiểm tra sâu bệnh
        </Text>

        <Text style={styles.description}>
          Kiểm tra toàn bộ cây trồng trong khu vực, ghi nhận dấu hiệu sâu bệnh bất thường.
        </Text>

        </View>
        <View style={styles.section}>
          <Row
            label="Khu vực"
            value="KV-B"
          />

          <Row
            label="Hạn hoàn thành"
            value="17/09/2026"
          />

          <Row
            label="Người giao"
            value="Tổ trưởng Lê Văn Hùng"
          />

          <Row
            label="Mức ưu tiên"
            value="Cao"
          />
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>
            Lưu ý từ tổ trưởng
          </Text>

          <Text style={styles.noteText}>
            Chụp rõ ảnh vị trí phát hiện sâu bệnh nếu có.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { ...shared.page },

  header: { ...shared.header },

  back: { ...shared.backText },

  headerTitle: { ...shared.title, flex: 1 },

  content: { ...shared.content },

  status: { ...shared.chip, ...shared.chipText, backgroundColor: colors.warningSoft, color: colors.warning },

  title: { ...shared.title },

  description: { ...shared.body },

  section: { ...shared.card },

  row: { ...shared.infoRow, alignItems: "center" },

  label: { ...shared.muted, flex: 1 },

  value: { ...shared.value },

  note: { ...shared.card },

  noteTitle: { ...shared.section },

  noteText: { ...shared.body },
});