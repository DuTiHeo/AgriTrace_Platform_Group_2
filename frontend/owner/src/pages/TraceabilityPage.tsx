import "../styles/traceability.css";
import { PackageCheck } from "lucide-react";
export default function TraceabilityPage() {
  return <main className="trace-page trace-state-page">
    <img src="/branding/logo.svg" alt="Farmer QuickLog" />
    <PackageCheck size={46} /><h1>Truy xuất công khai chưa khả dụng</h1>
    <p>Hệ thống hiện chưa hỗ trợ xem thông tin lô thu hoạch bằng đường dẫn công khai.</p>
  </main>;
}
