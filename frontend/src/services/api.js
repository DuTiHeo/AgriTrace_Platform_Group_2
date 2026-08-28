import axios from "axios";

// Khi chay tren may ao/web: "http://localhost:8000"
// Khi chay tren dien thoai that qua Expo Go: doi thanh IP LAN cua may chay backend, vi du "http://192.168.1.5:8000"
const BASE_URL = "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});
