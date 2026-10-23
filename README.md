# AgriTrace Platform - Phân hệ Sản Xuất Số & Farmer QuickLog 🌾📱💻

**AgriTrace Platform** là hệ thống quản lý sản xuất nông nghiệp kỹ thuật số toàn diện dành cho các hợp tác xã và trang trại nông nghiệp hiện đại. Dự án bao gồm hệ thống Backend API (FastAPI + PostGIS) và **hai ứng dụng frontend độc lập**: Ứng dụng di động dành cho Công nhân / Tổ trưởng hiện trường và Ứng dụng Web dành riêng cho Chủ nông trại (Farm Owner).

Repository được tổ chức theo mô hình Monorepo.

---

## 1. Tình Trạng Triển Khai Của Dự Án

* **Backend API (FastAPI + PostgreSQL PostGIS):**
  - <span style="color:green;font-weight:bold;">Đợt 0 (Nền tảng Auth & Bảo mật):</span> **ĐÃ XONG 100%** (Đăng nhập SĐT, JWT, blacklist, SlowAPI `5/minute`).
  - <span style="color:green;font-weight:bold;">Đợt 1 (CRUD Nông trại, Vùng trồng, Tổ & Mùa vụ):</span> **ĐÃ XONG 100%** (PostGIS `ST_Contains`, quản lý tổ & tổ trưởng, danh mục giống cây `crop_catalog` & mốc chăm sóc `crop_care_milestones`, khởi tạo mùa vụ `seasons`).
  - <span style="color:green;font-weight:bold;">Đợt 2 (Farmer QuickLog, Nhiệm vụ & Lô thu hoạch):</span> **ĐÃ XONG 100%** (Nhật ký QuickLog định vị GPS, upload tối đa 5 ảnh JPG $\le$ 5MB, ghi chú nhắc nhở `log_notes` kèm cờ `resolved`, giao việc `tasks`, gom mùa vụ vào `harvest_batches`, tự sinh `batch_code` và phát hành Mã QR tem nhãn truy xuất).
  - <span style="color:orange;font-weight:bold;">Đợt 3 (Các module bổ trợ & Giám sát):</span> **CHƯA TRIỂN KHAI Ở BACKEND** (gồm `reminder_schedules`, `error_reports`, `notifications`, `system_logs` - dự kiến hoàn thiện sau).

* **Frontend:**
  1. **Ứng dụng Di động Worker & Leader (`frontend/src/`):** React Native + Expo Router v57 (chạy cổng `8083` hoặc Web browser). Hỗ trợ nhận việc, xem lịch trình, ghi nhật ký đồng ruộng Farmer QuickLog gắn tọa độ GPS và chụp ảnh thực tế.
  2. **Ứng dụng Web Quản trị Nông trại Owner Web (`frontend/owner/`):** React 19 + Vite + TypeScript (chạy cổng `5173`). Dành riêng cho Chủ sở hữu nông trại quản lý ranh giới bản đồ số, lô đất, mùa vụ, cơ cấu nhân sự, giao việc, duyệt lô thu hoạch và in tem nhãn QR.

---

## 2. Cấu Trúc Thư Mục Chính

```text
[AgriTrace_Platform_Group_2]/
├── AGENTS.md                                # Hướng dẫn kỹ thuật & ngữ cảnh chi tiết dành cho AI Agents
├── README.md                                # Tài liệu tổng quan dự án (Tệp này)
├── docker-compose.yml                       # Docker Compose 2 dịch vụ: agritrace_db (5432) & agritrace_backend (8000)
│
├── database/                                # Quản lý cơ sở dữ liệu
│   ├── init_db.sql                          # Schema DDL 19 bảng, triggers tự động updated_at, PostGIS extension
│   ├── sample_data.sql                      # Seed data thử nghiệm đầy đủ tài khoản, nông trại, mùa vụ, log mẫu
│   └── README.md                            # Tài liệu thiết kế ERD 19 bảng & chi tiết các cột
│
├── docs/                                    # Tài liệu nghiệp vụ & kỹ thuật
│   ├── Quy_Trinh_Nghiep_Vu.md               # ĐẶC TẢ NGHIỆP VỤ DUY NHẤT: 25 UCs, 20 Business Rules, 20 Exceptions, State Machines
│   ├── API_Documentation.md                 # Tra cứu chi tiết toàn bộ REST API Endpoints theo các đợt phát triển
│   ├── GETTING_STARTED.md                   # Hướng dẫn chi tiết khởi chạy môi trường và tài khoản mẫu
│   └── Postman_Test_FarmingLog_LogPhoto_LogNote.md # Kịch bản kiểm thử Postman luồng Farmer QuickLog
│
├── backend/                                 # Mã nguồn Backend API (FastAPI)
│   ├── app/routers/                         # REST API Controllers (/auth, /organizations, /plots, /farming-logs...)
│   ├── app/crud/                            # Data Access Layer thuần túy (SQLAlchemy parameterized text queries)
│   ├── app/schemas/                         # Pydantic v2 DTOs (Request Validation & Response Models)
│   ├── app/db/                              # Engine, SessionLocal, dependency get_db()
│   ├── app/core/                            # Cấu hình Pydantic BaseSettings, Bcrypt, JWT, SlowAPI Limiter
│   └── uploads/                             # Thư mục lưu trữ ảnh tải lên cục bộ (/uploads/farming-logs/...)
│
├── frontend/                                # Thư mục Frontend Monorepo
│   ├── package.json                         # Scripts chạy cả Expo Mobile và Owner Web
│   ├── src/                                 # [APP 1] Mobile App dành cho Công nhân & Tổ trưởng (Expo Router v57)
│   └── owner/                               # [APP 2] Web App Quản trị dành cho Chủ nông trại (React 19 + Vite)
│
└── .agents/                                 # Hệ thống 7 Subagents chuyên biệt & Công cụ Call Graph
    ├── tools/build_call_graph.py            # AST & Regex Scanner phân tích Blast Radius xuyên suốt
    ├── context/call_graph.json              # Đồ thị phụ thuộc mã nguồn tự động sinh
    ├── context/active_plan.md               # Kế hoạch phát triển tính năng dùng chung giữa các subagents
    └── agents/                              # 7 Subagents: graph-analyzer, planner, plan-reviewer, coder, code-reviewer, tester, api-doc-updater
```

---

## 3. Khởi Chạy Nhanh Hệ Thống (Quick Start)

### Bước 1: Khởi động Database & Backend (Docker Compose)
```bash
# Khởi chạy Database PostGIS (cổng 5432) và Backend FastAPI (cổng 8000)
docker compose up -d --build

# Nạp dữ liệu mẫu (chỉ cần chạy lần đầu sau khi container DB khởi động)
docker exec -i agritrace_db psql -U agritrace -d agritrace_farm < database/sample_data.sql
```
- **Kiểm tra trạng thái**: `curl -s http://localhost:8000/health` $\rightarrow$ `{"status":"ok","message":"Backend da ket noi thanh cong voi Database"}`
- **Swagger UI Interactive Docs**: `http://localhost:8000/docs`

---

### Bước 2: Khởi chạy Ứng dụng Web Chủ Nông trại (Owner Web)
Ứng dụng Web tại `frontend/owner` dành cho Chủ sở hữu:
```bash
cd frontend
npm run owner:install    # Cài đặt thư viện cho Owner Web (lần đầu)
npm run owner:dev        # Khởi chạy server phát triển
```
- Truy cập trình duyệt: **`http://localhost:5173`**
- Đăng nhập bằng tài khoản Owner: **`0901000001`** / **`Test@1234`**

---

### Bước 3: Khởi chạy Ứng dụng Di động Worker & Leader (Expo React Native)
Ứng dụng di động tại `frontend/src` dành cho Công nhân và Tổ trưởng:
```bash
cd frontend
npm ci                   # Cài đặt thư viện theo lockfile (lần đầu)
cp .env.example .env     # Sửa EXPO_PUBLIC_API_BASE_URL thành IP mạng LAN máy bạn (ví dụ: http://192.168.1.53:8000)
npm start -- --clear     # Khởi chạy Expo Dev Server (Cổng 8083)
```
- Quét mã QR bằng ứng dụng **Expo Go** trên điện thoại (cùng mạng Wi-Fi với máy tính), hoặc nhấn phím `w` để mở giao diện Web trên trình duyệt.

---

## 4. Danh Sách Tài Khoản Thử Nghiệm Mẫu (`sample_data.sql`)
Mật khẩu dùng chung cho toàn bộ tài khoản mẫu: **`Test@1234`**

| Vai trò (`role`) | SĐT đăng nhập | Họ tên | Nông trại trực thuộc | Ứng dụng tương thích |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** (Chủ sở hữu) | `0901000001` | Nguyễn Văn An | Nông trại Xanh Đà Lạt | **Owner Web (Cổng 5173)** |
| **Leader** (Tổ trưởng) | `0901000002` | Lê Văn Cường | Tổ 1 - Nông trại Xanh Đà Lạt | **Mobile App (Cổng 8083)** |
| **Worker** (Công nhân) | `0901000003` | Phạm Thị Dung | Tổ 1 - Nông trại Xanh Đà Lạt | **Mobile App (Cổng 8083)** |
| **Admin** (Quản trị viên)| `0900000008` | Trần Thị Bình | Toàn hệ thống | Quản trị danh mục chung |

---

## 5. Tài Liệu Nghiệp Vụ Tham Khảo
- [Đặc tả Quy trình & Quy tắc nghiệp vụ (`docs/Quy_Trinh_Nghiep_Vu.md`)](./docs/Quy_Trinh_Nghiep_Vu.md)
- [Đặc tả Kỹ thuật REST API (`docs/API_Documentation.md`)](./docs/API_Documentation.md)
- [Hướng dẫn Khởi chạy chi tiết (`docs/GETTING_STARTED.md`)](./docs/GETTING_STARTED.md)
- [Chỉ dẫn dành cho AI Agents & Nhà phát triển (`AGENTS.md`)](./AGENTS.md)
