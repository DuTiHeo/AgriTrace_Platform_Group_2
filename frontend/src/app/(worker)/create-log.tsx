import { Redirect } from 'expo-router';

/** Tạo nhật ký thủ công luôn mở một biểu mẫu trống. */
export default function CreateWorkerLogScreen() {
  return <Redirect href="/(worker)/report-note" />;
}
