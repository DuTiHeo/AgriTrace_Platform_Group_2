import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="page not-found-page">
      <div className="card not-found-card">
        <SearchX size={42} />
        <span>404</span>
        <h1>Không tìm thấy trang</h1>
        <p>Đường dẫn không tồn tại hoặc nội dung đã được di chuyển.</p>
        <div>
          <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} />Quay lại</button>
          <Link className="btn btn-primary" to="/"><Home size={16} />Về tổng quan</Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
