import "../styles/notifications.css";
import { Bell } from "lucide-react";
export default function NotificationsPage() {
  return <div className="page notifications-page">
    <div className="page-heading"><div><h1>Thông báo</h1></div></div>
    <section className="card notification-empty" role="status">
      <Bell size={34} /><h2>Thông báo chưa khả dụng</h2><p>Hệ thống hiện chưa hỗ trợ nhận và đánh dấu thông báo.</p>
    </section>
  </div>;
}
