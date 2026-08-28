# Frontend - React Native (Expo)

Thu muc nay CHUA duoc khoi tao bang Expo (vi can chay lenh that de sinh dung file cau hinh).
Chi 1 nguoi trong nhom lam buoc nay 1 lan roi commit, cac ban khac chi can "npm install".

## Khoi tao lan dau (chi lam 1 lan)
```bash
cd frontend
npx create-expo-app@latest . --template blank
```
Sau khi lenh tren chay xong, no se tu sinh App.js, package.json, assets/...
Giu nguyen thu muc `src/` da co san (screens, components, services) va bat dau code trong do.

## Chay hang ngay
```bash
cd frontend
npm install
npx expo start
```
Quet ma QR bang app Expo Go tren dien thoai that (cung mang Wifi voi may tinh).

## Goi API tu Backend
Xem file `src/services/api.js` - nho doi BASE_URL thanh dia chi IP LAN cua may chay backend
khi test tren dien thoai that (khong dung duoc "localhost" tu dien thoai).
