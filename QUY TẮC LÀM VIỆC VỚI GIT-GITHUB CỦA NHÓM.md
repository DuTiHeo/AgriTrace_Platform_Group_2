# QUY TẮC LÀM VIỆC VỚI GIT/GITHUB

## 1. Nguyên tắc chung

- Không làm việc trực tiếp trên branch `main`.
- Mỗi thành viên làm việc trên **branch riêng cho từng chức năng/task**.
- Không tự ý sửa hoặc xóa code của người khác nếu chưa trao đổi.
- Trước khi bắt đầu code phải cập nhật code mới nhất từ `main`.
- Không commit code đang lỗi, không build được hoặc chưa hoàn thiện nếu commit đó gây ảnh hưởng đến người khác.
- Mọi thay đổi quan trọng đưa vào `main` đều phải thông qua Pull Request (PR).
- Không tự ý merge PR của chính mình.
- Khi gặp conflict, người tạo PR có trách nhiệm xử lý conflict và kiểm tra lại project trước khi merge.

---

# 2. Quy tắc Branch

## Branch chính

```text
main
```

- `main` luôn phải ở trạng thái ổn định.
- Không push trực tiếp vào `main`.
- Chỉ merge code đã được review và kiểm tra.

## Branch chức năng

Đặt tên branch theo dạng:

```text
feature/<ten-chuc-nang>
```

Ví dụ:

```text
feature/login
feature/register
feature/home-screen
feature/map
```

## Bug

```text
fix/<ten-bug>
```

Ví dụ:

```text
fix/login-validation
fix/crash-on-map
```

## Refactor

```text
refactor/<ten-noi-dung>
```

Ví dụ:

```text
refactor/network-layer
refactor/user-model
```

Tên branch nên **ngắn, rõ nghĩa, viết bằng tiếng Anh và dùng dấu ****`-`**** thay vì khoảng trắng**.

---

# 3. Quy trình làm việc chuẩn

Mỗi task nên đi theo quy trình:

```text
main
  ↓
Tạo branch mới
  ↓
Code
  ↓
Commit
  ↓
Push lên GitHub
  ↓
Pull Request
  ↓
Code Review
  ↓
Fix nếu cần
  ↓
Merge vào main
```

Ví dụ:

```bash
git checkout main
git pull origin main

git checkout -b feature/login
```

Sau khi hoàn thành (code xong):

```bash
git add .
git commit -m "feat: implement login"
git push -u origin feature/login
```

Sau đó tạo Pull Request trên GitHub.

---

# 4. Quy tắc Commit

Commit phải thể hiện **một thay đổi có ý nghĩa**, không commit tất cả mọi thứ vào một commit khổng lồ.

### Format

```text
<type>: <description>
```

Các `type` thường dùng:

```text
feat      → thêm chức năng
fix       → sửa bug
refactor  → thay đổi cấu trúc code nhưng không thêm chức năng
docs      → tài liệu
style     → format code, không thay đổi logic
test      → thêm/sửa test
chore     → công việc cấu hình, dependency,...
```

### Ví dụ tốt

```text
feat: add login screen
feat: implement user authentication
fix: fix login validation
fix: prevent crash when user is nil
refactor: separate network service
docs: update README
chore: update dependencies
```

### Không nên

```text
update
fix
code
abc
test
final
final2
final-final
sửa lỗi
làm bài
```

**Một commit nên trả lời được câu hỏi: "Commit này đã thay đổi cái gì?"**

---

# 5. Không commit những file không cần thiết

Không commit các file sinh ra tự động bởi IDE/build system hoặc chứa thông tin cá nhân.



Các file này nên được đưa vào `.gitignore` phù hợp với project.

**Tuyệt đối không commit:**

```text
API Key
Password
Token
Private Key
Secret
File chứa thông tin đăng nhập
```

Nếu project có API key/secret thì phải trao đổi với PM để thống nhất cách lưu.

---

# 6. Trước khi code

Luôn cập nhật `main` trước khi tạo branch:

```bash
git checkout main
git pull origin main
git checkout -b feature/ten-chuc-nang
```

Không nên tạo branch mới từ một `main` đã quá cũ.

---

# 7. Trong quá trình code

Không nên code một task quá lớn rồi mới commit.

Ví dụ task:

```text
Implement Login
```

Có thể chia thành:

```text
feat: create login UI
feat: add login validation
feat: implement login API
feat: handle login error
```

Như vậy khi có vấn đề sẽ dễ tìm và rollback hơn.

---

# 8. Trước khi Push

Trước khi push code lên GitHub:

```bash
git status
git diff
```

Kiểm tra:

- Có file nào không nên commit không?
- Có API key/password không?
- Có vô tình sửa code của người khác không?
- Code có build được không?
- Có debug code / `print()` thừa không?
- Commit có đúng nội dung không?

Sau đó:

```bash
git add .
git commit -m "feat: ..."
git push
```

---

# 9. Pull Request

Mỗi PR nên:

- Có tên rõ ràng.
- Chỉ chứa **một task/chức năng chính**.
- Không đưa quá nhiều thay đổi không liên quan vào cùng một PR.
- Mô tả mình đã làm gì.
- Nếu có UI thì nên thêm screenshot/video khi cần.
- Người tạo PR phải tự kiểm tra code trước khi yêu cầu người khác review.

Ví dụ tiêu đề:

```text
feat: implement login screen
```

Mô tả:

```text
## Changes
- Add login UI
- Add email/password validation
- Connect login API

## Testing
- Tested successful login
- Tested wrong password
- Tested empty fields
```

---

# 10. Code Review

Người review không chỉ kiểm tra xem **code có chạy hay không**, mà còn kiểm tra:

- Logic có đúng không?
- Code có dễ đọc không?
- Có duplicate code không?
- Có cách triển khai đơn giản hơn không?
- Có bug tiềm ẩn không?
- Có ảnh hưởng đến phần code khác không?

Khi review:

### Không nên

```text
Code như này ngu vãi
```

### Nên

```text
Có thể tách phần này thành một function riêng để dễ đọc và tái sử dụng hơn.
```

Review tập trung vào **code**, không công kích người viết code.

---

# 11. Quy tắc Merge

Chỉ merge khi:

- PR đã được review.
- Không còn conflict.
- Project build/test thành công.
- Không có issue nghiêm trọng đang tồn tại.

Người tạo PR **không tự approve và merge PR của chính mình**.

---

# 12. Khi Main có code mới

Trong lúc đang code, nếu `main` đã có thay đổi mới thì cần cập nhật branch của mình.

Có thể dùng:

```bash
git fetch origin
git merge origin/main
```

hoặc theo workflow của nhóm:

```bash
git fetch origin
git rebase origin/main
```

**Quan trọng:** cả nhóm nên thống nhất dùng `merge` hoặc `rebase`, không tự ý mỗi người một kiểu.

Nếu chưa quen Git thì nên dùng `merge` trước vì dễ hiểu và ít rủi ro hơn.

---

# 13. Xử lý Conflict

Khi xảy ra conflict:

```text
<<<<<<< HEAD
code của mình
=======
code từ main
>>>>>>> main
```

Không được xóa đại một bên cho hết conflict.

Phải xem:

```text
Code của mình cần giữ gì?
Code của main cần giữ gì?
Hai phần có thể kết hợp không?
```

Sau khi xử lý:

```bash
git add .
git commit
```

Sau đó phải **build/test lại project** trước khi push/merge.

---

# 14. Không dùng các lệnh nguy hiểm tùy tiện

Đặc biệt cẩn thận với:

```bash
git reset --hard
git push --force
git push --force-with-lease
git clean -fd
```

Không sử dụng nếu chưa hiểu rõ hậu quả.

Đặc biệt:

```bash
git push --force
```

**Không được dùng trên ****`main`**.

---

# 15. Khi đang làm mà phát hiện code người khác có vấn đề

Không tự tiện sửa một phần code lớn của người khác trong branch của mình.

Ví dụ đang làm Login nhưng phát hiện Network Layer có bug.

Nên:

```text
Báo cho người phụ trách Network Layer
```

hoặc tạo task/issue riêng:

```text
fix: handle network timeout
```

Điều này giúp Git history rõ ràng và tránh việc một PR chứa quá nhiều thay đổi không liên quan.

---

# 16. Không commit kiểu "một đống thay đổi"

Không nên:

```text
feat: login + register + home + map + fix random bug
```

Nên tách:

```text
feat: implement login
feat: implement register
feat: implement home screen
feat: add map screen
fix: handle location permission
```

**Một commit/PR càng tập trung vào một mục đích thì càng dễ review.**

---

# 17. Quy tắc khi kết thúc task

Sau khi PR đã merge:

```bash
git checkout main
git pull origin main
```

Có thể xóa branch local:

```bash
git branch -d feature/login
```

Branch trên GitHub cũng nên được xóa sau khi merge nếu nhóm không có lý do giữ lại.

---

# 18. Quy tắc quan trọng nhất

### ❌ Không làm

```text
Code → git add . → git commit → git push main
```

### ✅ Nên làm

```text
Pull main
    ↓
Tạo branch
    ↓
Code
    ↓
Commit nhỏ, rõ ràng
    ↓
Push branch
    ↓
Pull Request
    ↓
Review
    ↓
Fix
    ↓
Merge
    ↓
Delete branch
```

---

# 19. Cheat Sheet

### Bắt đầu task

```bash
git checkout main
git pull origin main
git checkout -b feature/login
```

### Lưu code

```bash
git status
git add .
git commit -m "feat: implement login"
git push -u origin feature/login
```

### Cập nhật main

```bash
git checkout main
git pull origin main
```

### Cập nhật branch đang làm

```bash
git fetch origin
git merge origin/main
```

### Sau khi PR được merge

```bash
git checkout main
git pull origin main
git branch -d feature/login
```

---

# 20. Quy tắc ngắn gọn để cả nhóm nhớ

> **Không push trực tiếp vào ****`main`****.**\
> **Mỗi task một branch.**\
> **Mỗi commit một mục đích rõ ràng.**\
> **PR phải được review trước khi merge.**\
> **Luôn pull code mới trước khi bắt đầu task.**\
> **Không commit secret/API key.**\
> **Không tự ý force push.**\
> **Conflict phải được xử lý cẩn thận và test lại.**\
> **Code review góp ý vào code, không công kích người viết.**
