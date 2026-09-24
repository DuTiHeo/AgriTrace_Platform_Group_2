import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { RecoveryChallenge } from '@/sevices/auth.sevice';

type Recovery = RecoveryChallenge & { phone: string; resetToken?: string };
const Context = createContext<{
  recovery: Recovery | null;
  setRecovery: (value: Recovery | null) => void;
} | null>(null);

export function RecoveryProvider({ children }: PropsWithChildren) {
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  return <Context.Provider value={{ recovery, setRecovery }}>{children}</Context.Provider>;
}

export function useRecovery() {
  const value = useContext(Context);
  if (!value) throw new Error('RecoveryProvider is required');
  return value;
}
