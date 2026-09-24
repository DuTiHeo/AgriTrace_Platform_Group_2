import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { type Href, router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkerHeader } from '@/components/worker/worker-header';

/** Entry point for manual work logs; select work first, then reuse camera/report flow. */
export default function CreateWorkerLogScreen() {
  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <WorkerHeader showGreeting={false} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ghi mới công việc</Text>

        <Text style={styles.sub}>
          Chọn nhiệm vụ để tạo báo cáo thực hiện.
        </Text>

        {[
          'Tưới nước hằng ngày',
          'Kiểm tra sâu bệnh',
          'Phun thuốc trừ sâu'
        ].map((task) => (
          <Pressable
            key={task}
            style={styles.card}
            onPress={() =>
              router.push({ pathname: '/(worker)/report-note', params: { taskTitle: task, area: task === 'Kiểm tra sâu bệnh' ? 'KV-B' : 'KV-A' } } as Href)
            }
          >
            <View>
              <Text style={styles.task}>{task}</Text>

              <Text style={styles.meta}>
                {task === 'Kiểm tra sâu bệnh' ? 'KV-B' : 'KV-A'} · Hôm nay
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { ...shared.page },

  content: { ...shared.content, flexGrow: 1 },

  title: { ...shared.title },

  sub: { ...shared.muted },

  card: { ...shared.card, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  task: { ...shared.section },

  meta: { ...shared.muted, marginTop: 6 },

  arrow: {
    color: colors.primary,
    fontSize: 28
  },
});