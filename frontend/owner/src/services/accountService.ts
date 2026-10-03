import type {
  AccountPreferences,
  OwnerAccount,
  UpdateOwnerAccountInput,
} from "../types/account";
import { httpClient } from "./httpClient";

const PREFERENCES_KEY = "farmer_quicklog_owner_preferences_v1";
let recoveryChallenge = "";
let recoveryToken = "";

localStorage.removeItem("farmer_quicklog_owner_password_v1");
sessionStorage.removeItem("farmer_quicklog_owner_session_v1");
sessionStorage.removeItem("farmer_quicklog_owner_recovery_v1");

type AuthUser = {
  user_id: string;
  full_name: string;
  phone: string;
  date_of_birth: string | null;
  address: string | null;
  role: string;
  org_id?: string | null;
  team_id?: string | null;
  created_at: string | null;
};

const initialPreferences: AccountPreferences = {
  cultivationReminders: true,
  taskUpdates: true,
  harvestAlerts: true,
  weeklyDigest: false,
};

const clone = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

function toOwnerAccount(user: AuthUser): OwnerAccount {
  if (user.role !== "owner") {
    httpClient.clearAccessToken();
    throw new Error("Trang quản trị này dành cho Chủ nông trại. Vui lòng dùng ứng dụng dành cho vai trò của bạn.");
  }
  return {
    id: user.user_id,
    fullName: user.full_name,
    phone: user.phone,
    email: "",
    dateOfBirth: user.date_of_birth ?? "",
    address: user.address ?? "",
    role: "owner",
    joinedAt: user.created_at ?? "",
    lastLoginAt: "",
  };
}

function readPreferences(key: string): AccountPreferences {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(initialPreferences));
    return clone(initialPreferences);
  }

  try {
    return JSON.parse(stored) as AccountPreferences;
  } catch {
    localStorage.setItem(key, JSON.stringify(initialPreferences));
    return clone(initialPreferences);
  }
}

export const accountService = {
  isAuthenticated() {
    return httpClient.hasAccessToken();
  },

  async getAccount(): Promise<OwnerAccount> {
    const user = await this.getCurrentUser();
    toOwnerAccount(user);
    const profile = await httpClient.get<AuthUser>(`/users/${user.user_id}`);
    return toOwnerAccount(profile);
  },

  async getCurrentUser(): Promise<AuthUser> {
    const user = await httpClient.get<AuthUser>("/auth/me");
    if (user.user_id) return user;
    try {
      const token = httpClient.getAccessToken();
      const encoded = token?.split(".")[1];
      if (!encoded) throw new Error("Missing token");
      const claims = JSON.parse(atob(encoded.replaceAll("-", "+").replaceAll("_", "/"))) as { sub?: unknown };
      if (typeof claims.sub !== "string" || !claims.sub) throw new Error("Missing identity");
      return { ...user, user_id: claims.sub };
    } catch {
      httpClient.clearAccessToken();
      throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
    }
  },

  async updateAccount(_input: UpdateOwnerAccountInput): Promise<OwnerAccount> {
    void _input;
    throw new Error("Hệ thống chưa hỗ trợ chủ nông trại tự cập nhật hồ sơ.");
  },

  async getPreferences(): Promise<AccountPreferences> {
    const account = await this.getAccount();
    return clone(readPreferences(`${PREFERENCES_KEY}:${account.id}`));
  },

  async updatePreferences(
    preferences: AccountPreferences,
  ): Promise<AccountPreferences> {
    const account = await this.getAccount();
    localStorage.setItem(`${PREFERENCES_KEY}:${account.id}`, JSON.stringify(preferences));
    window.dispatchEvent(new Event("account-updated"));
    window.dispatchEvent(new Event("notifications-updated"));
    return clone(preferences);
  },

  async changePassword(current: string, next: string): Promise<void> {
    await httpClient.post("/auth/change-password", {
      old_password: current,
      new_password: next,
    });
    httpClient.clearAccessToken();
    window.dispatchEvent(new Event("account-updated"));
  },

  async login(phone: string, password: string): Promise<OwnerAccount> {
    const token = await httpClient.post<{ access_token: string }>(
      "/auth/login",
      { phone: phone.trim(), password },
      { authenticated: false },
    );
    httpClient.setAccessToken(token.access_token, false);
    let account: OwnerAccount;
    try {
      account = await this.getAccount();
    } catch (error) {
      httpClient.clearAccessToken();
      throw error;
    }
    httpClient.notifyAuthChange();
    window.dispatchEvent(new Event("account-updated"));
    return account;
  },

  async logout() {
    try {
      await httpClient.post("/auth/logout");
    } finally {
      httpClient.clearAccessToken();
      window.dispatchEvent(new Event("account-updated"));
    }
  },

  async requestPasswordReset(identifier: string) {
    const result = await httpClient.post<{
      challenge: string;
      demo_otp: string;
    }>("/auth/forgot-password", { phone: identifier.trim() }, { authenticated: false });
    recoveryChallenge = result.challenge;
    recoveryToken = "";
    return { demoCode: result.demo_otp };
  },

  async verifyPasswordReset(code: string) {
    if (!recoveryChallenge) throw new Error("Vui lòng bắt đầu lại yêu cầu khôi phục.");
    const result = await httpClient.post<{ reset_token: string }>(
      "/auth/verify-otp",
      { challenge: recoveryChallenge, otp: code.trim() },
      { authenticated: false },
    );
    recoveryToken = result.reset_token;
  },

  async resetPassword(next: string) {
    if (!recoveryToken) throw new Error("Bạn cần xác nhận mã trước khi đặt mật khẩu mới.");
    await httpClient.post("/auth/reset-password", {
      reset_token: recoveryToken,
      new_password: next,
    }, { authenticated: false });
    recoveryChallenge = "";
    recoveryToken = "";
  },
};

