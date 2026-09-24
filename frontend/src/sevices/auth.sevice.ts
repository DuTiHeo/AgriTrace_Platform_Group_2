import { API_BASE_URL } from '@/constants/api';


// ---- Kiểu dữ liệu khớp với backend schemas/auth.py ----
export type LoginRequest = {
  phone: string;
  password: string;
};

export type Token = {
  access_token: string;
  token_type: string;
};

export type UserInformation = {
  full_name: string;
  phone: string;
  national_id: string | null;
  address: string | null;
  role: string;        // 'leader' hoặc 'worker'
  org_id: string | null;
  team_id: string | null;
};

async function request(path: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal });
    // Token hết hạn hoặc đã thu hồi: vẫn cho phép kết thúc phiên ở frontend.
    if (!response.ok && !(path === '/auth/logout' && response.status === 401)) {
      if (['/auth/forgot-password', '/auth/verify-otp', '/auth/reset-password', '/auth/change-password'].includes(path)) {
        const body = await response.json().catch(() => null);
        if (response.status < 500 && typeof body?.detail === 'string') throw new Error(body.detail);
      }
      const messages: Record<number, string> = {
        401: path === '/auth/login'
          ? 'Số điện thoại hoặc mật khẩu không đúng.'
          : 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
        403: 'Tài khoản của bạn đã bị vô hiệu hóa hoặc không có quyền truy cập.',
        422: 'Thông tin gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
        429: 'Bạn thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.',
      };
      throw new Error(response.status >= 500
        ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
        : messages[response.status] ?? 'Yêu cầu thất bại. Vui lòng thử lại.');
    }
    return response;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    }
    if (error instanceof TypeError) {
      throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type RecoveryChallenge = { challenge: string; demo_otp?: string; expires_in: number };

export async function forgotPassword(phone: string): Promise<RecoveryChallenge> {
  const response = await request('/auth/forgot-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }),
  });
  return response.json();
}

export async function verifyOtp(challenge: string, otp: string): Promise<{ reset_token: string }> {
  const response = await request('/auth/verify-otp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge, otp }),
  });
  return response.json();
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  await request('/auth/reset-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
  });
}

export async function changePassword(accessToken: string, oldPassword: string, newPassword: string): Promise<void> {
  await request('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

// ---- Hàm login: POST /auth/login ----
export async function login(payload: LoginRequest): Promise<Token> {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json(); // { access_token, token_type }
}

// ---- Hàm lấy thông tin user hiện tại: GET /auth/me ----
export async function getMe(accessToken: string): Promise<UserInformation> {
  const response = await request('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.json();
}

// ---- Hàm logout: POST /auth/logout ----
export async function logout(accessToken: string): Promise<void> {
  await request('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

