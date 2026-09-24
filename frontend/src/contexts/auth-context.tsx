import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { UserInformation } from '@/sevices/auth.sevice';

type AuthContextValue = {
  accessToken: string | null;
  user: UserInformation | null;
  setAuth: (token: string, user: UserInformation) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInformation | null>(null);

  function setAuth(token: string, userInfo: UserInformation) {
    setAccessToken(token);
    setUser(userInfo);
  }

  function clearAuth() {
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ accessToken, user, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
