import BackButton from "../../components/owner/BackButton_wb";
import { Home, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="page not-found-page">
      <div className="card not-found-card">
        <SearchX size={42} />
        <span>404</span>
        <div className="page-title-with-back"><BackButton label="Quay lại trang trước" onClick={() => navigate(-1)} /><h1>Không tìm thấy trang</h1></div>
        <p>Đường dẫn không tồn tại hoặc nội dung đã được di chuyển.</p>
        <div>
          <Link className="btn btn-primary" to="/"><Home size={16} />Về tổng quan</Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
