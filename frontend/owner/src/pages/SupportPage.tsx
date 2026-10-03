import "../styles/support.css";
import { LifeBuoy } from "lucide-react";
export default function SupportPage() {
  return <div className="page support-page">
    <div className="page-heading"><div><h1>Hỗ trợ & báo lỗi</h1></div></div>
    <section className="card support-empty" role="status">
      <LifeBuoy size={34} /><h2>Gửi báo cáo chưa khả dụng</h2><p>Hệ thống hiện chưa hỗ trợ gửi báo cáo và theo dõi phản hồi. Vui lòng liên hệ người quản trị để được hỗ trợ.</p>
    </section>
  </div>;
}
