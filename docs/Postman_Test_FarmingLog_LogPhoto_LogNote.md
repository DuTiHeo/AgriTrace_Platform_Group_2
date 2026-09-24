# Huong dan test Postman - FarmingLog + LogPhoto + LogNote

Base URL mac dinh:

```text
http://localhost:8000
```

Neu dung sample data, mat khau chung la:

```text
Test@1234
```

Tai khoan hay dung de test:

```text
Worker Da Lat: 0901000003
Leader Da Lat: 0901000002
Owner Da Lat: 0901000001
Admin: 0900000008
```

ID mau hay dung:

```text
season_id dang growing cua Da Lat:
70000000-0000-0000-0000-000000000001

log_id co san trong sample data:
a0000000-0000-0000-0000-000000000001
```

## 0. Chuan bi DB

Neu DB moi tao lai bang `docker-compose down -v` roi `docker-compose up -d`, `database/init_db.sql` da co cot `log_notes.resolved`.

Neu DB dang ton tai tu truoc, can chay migration nay mot lan:

```sql
ALTER TABLE log_notes
    ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT FALSE;
```

File migration da co o:

```text
database/migrations/20260924_add_log_notes_resolved.sql
```

## 1. Tao environment trong Postman

Tao Environment, them cac bien:

```text
base_url = http://localhost:8000
token =
log_id =
photo_url =
note_id =
```

Moi request ben duoi dung `{{base_url}}`.

## 2. Dang nhap lay token

Request:

```text
POST {{base_url}}/auth/login
```

Tab `Body` -> `raw` -> `JSON`:

```json
{
  "phone": "0901000003",
  "password": "Test@1234"
}
```

Nhan `Send`, response se co:

```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

Copy `access_token` vao bien environment `token`.

Hoac trong tab `Tests` cua request login, dan script nay de Postman tu luu token:

```javascript
const json = pm.response.json();
pm.environment.set("token", json.access_token);
```

Voi cac request sau, vao tab `Authorization`:

```text
Type: Bearer Token
Token: {{token}}
```

## 3. Tao farming log moi

Dung token Worker hoac Leader.

Request:

```text
POST {{base_url}}/farming-logs
```

Authorization:

```text
Bearer Token: {{token}}
```

Body -> raw -> JSON:

```json
{
  "season_id": "70000000-0000-0000-0000-000000000001",
  "activity_type": "bao_cao_su_co",
  "content": "Phat hien la co dau hieu sau benh o luong A",
  "gps": {
    "latitude": 11.9415,
    "longitude": 108.4215
  }
}
```

Response tra ve `log_id`. Copy vao environment `log_id`.

Co the them script nay vao tab `Tests` de tu luu:

```javascript
const json = pm.response.json();
pm.environment.set("log_id", json.log_id);
```

Luu y:

- `activity_type` la free text, khong phai enum.
- `content` optional.
- `gps` bat buoc gom `latitude` va `longitude`.
- Season `completed` se bi chan `400`.

## 4. Upload anh cho log

Day la buoc quan trong: API upload anh la multipart/form-data, khong gui JSON.

Request:

```text
POST {{base_url}}/farming-logs/{{log_id}}/photos
```

Authorization:

```text
Bearer Token: {{token}}
```

Tab `Body`:

```text
chon form-data
```

Them row:

```text
KEY: files
TYPE: File
VALUE: chon file .jpg hoac .jpeg tu may
```

Neu muon upload nhieu anh cung luc, them nhieu row cung key `files`:

```text
KEY: files | TYPE: File | VALUE: anh_1.jpg
KEY: files | TYPE: File | VALUE: anh_2.jpeg
KEY: files | TYPE: File | VALUE: anh_3.jpg
```

Khong dat key la `file`, `photos`, hay `image`. Phai dung dung:

```text
files
```

Gioi han:

- Toi da 5 anh moi log, tinh ca anh da upload truoc do.
- Moi anh toi da 5MB.
- Chi nhan `.jpg` hoac `.jpeg`.
- Backend khong convert HEIC sang JPEG. Anh iPhone `.heic` phai duoc FE/client convert truoc.
- Chi tac gia cua farming log moi upload anh cho log do.

Response mau:

```json
[
  {
    "photo_id": "....",
    "log_id": "....",
    "url": "/uploads/farming-logs/....jpg",
    "created_at": "2026-09-24T..."
  }
]
```

De tu luu URL anh dau tien vao environment, them script nay vao tab `Tests`:

```javascript
const json = pm.response.json();
if (json.length > 0) {
  pm.environment.set("photo_url", json[0].url);
}
```

## 5. Xem lai log kem photos va notes

Request:

```text
GET {{base_url}}/farming-logs/{{log_id}}
```

Authorization:

```text
Bearer Token: {{token}}
```

Response se co:

```json
{
  "log_id": "...",
  "season_id": "...",
  "activity_type": "bao_cao_su_co",
  "content": "...",
  "gps": {
    "latitude": 11.9415,
    "longitude": 108.4215
  },
  "photos": [
    {
      "url": "/uploads/farming-logs/...jpg"
    }
  ],
  "notes": []
}
```

## 6. Lay anh ra xem

Trong response, `photo.url` la duong dan tuong doi, vi du:

```text
/uploads/farming-logs/LOG_ID/TEN_FILE.jpg
```

De xem anh, ghep voi base URL:

```text
{{base_url}}{{photo_url}}
```

Vi du neu response tra ve:

```text
"/uploads/farming-logs/11111111-1111-1111-1111-111111111111/abc.jpg"
```

Thi URL day du la:

```text
http://localhost:8000/uploads/farming-logs/11111111-1111-1111-1111-111111111111/abc.jpg
```

Co 2 cach xem:

1. Mo URL day du tren browser.
2. Tao request Postman:

```text
GET {{base_url}}{{photo_url}}
```

Request xem anh khong can bearer token vi `/uploads` dang duoc serve static public.

Luu y: anh co san trong `database/sample_data.sql` dang la URL demo `https://quicklog.example.com/...`, khong phai file nam trong local `/uploads`. Muon test xem anh local thi phai upload anh moi bang endpoint o muc 4.

## 7. List farming logs

Request:

```text
GET {{base_url}}/farming-logs
```

Authorization:

```text
Bearer Token: {{token}}
```

Co the loc theo season:

```text
GET {{base_url}}/farming-logs?season_id=70000000-0000-0000-0000-000000000001
```

Phan quyen doc:

- Worker/Leader thay log cua ca team minh.
- Owner thay log thuoc org minh so huu.
- Admin thay tat ca, co the loc `org_id`.

## 8. Leader/Owner viet note cho log

Dang nhap lai bang Leader Da Lat:

```json
{
  "phone": "0901000002",
  "password": "Test@1234"
}
```

Sau khi token moi duoc luu vao `{{token}}`, goi:

```text
POST {{base_url}}/log-notes
```

Authorization:

```text
Bearer Token: {{token}}
```

Body -> raw -> JSON:

```json
{
  "log_id": "{{log_id}}",
  "content": "Can chup can canh mat duoi la trong lan kiem tra tiep theo."
}
```

Response co `note_id`. Luu vao environment `note_id`, hoac dung script:

```javascript
const json = pm.response.json();
pm.environment.set("note_id", json.note_id);
```

Worker goi endpoint nay se bi `403`.

## 9. Toggle resolved cua note

Request:

```text
PATCH {{base_url}}/log-notes/{{note_id}}
```

Authorization:

```text
Bearer Token: {{token}}
```

Body -> raw -> JSON:

```json
{
  "resolved": true
}
```

Muon mo lai thi gui:

```json
{
  "resolved": false
}
```

Endpoint nay chi doi `resolved`, khong sua `content`.

## 10. Checklist test nhanh

1. Worker login.
2. Worker `POST /farming-logs`, luu `log_id`.
3. Worker `POST /farming-logs/{{log_id}}/photos`, Body `form-data`, key `files`, type `File`, chon `.jpg`.
4. `GET /farming-logs/{{log_id}}`, kiem tra `photos[0].url`.
5. `GET {{base_url}}{{photo_url}}` hoac mo tren browser de xem anh.
6. Leader login.
7. Leader `POST /log-notes`, luu `note_id`.
8. Leader `PATCH /log-notes/{{note_id}}` voi `{ "resolved": true }`.
9. `GET /farming-logs/{{log_id}}` lan nua, kiem tra `notes[0].resolved = true`.

## 11. Loi hay gap

`401 Token khong hop le hoac da het han`

- Chua gan Bearer Token.
- Token trong environment rong/sai.
- Da logout hoac token het han.

`403 Chi tac gia nhat ky moi duoc upload anh`

- Ban dang login bang user khac nguoi da tao log.

`400 Moi nhat ky chi duoc toi da 5 anh`

- Log da co anh tu truoc, tong so anh sau upload vuot qua 5.

`400 Chi chap nhan anh dinh dang .jpg hoac .jpeg`

- Dang upload `.png`, `.heic`, `.webp`, hoac file khong co extension dung.

`404 khi GET /uploads/...`

- Ban dang xem URL anh sample external, khong phai anh local moi upload.
- Backend chua mount volume `/app/uploads` hoac server chua restart sau khi sua code.
- URL bi thieu prefix `http://localhost:8000`.
