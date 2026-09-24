import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
type Issue = { id: string; kind: string; text: string; photo?: string };
type AccountUtilities = { issues: Issue[]; showBadge: boolean; draft: { kind: string; text: string; photo?: string } };
const initial = (): AccountUtilities => ({ issues: [], showBadge: true, draft: { kind: 'Lỗi chức năng', text: '' } });
function useUtilitiesState() {
  const { user } = useAuth();
  const key = JSON.stringify([user?.phone, user?.role, user?.org_id, user?.team_id]);
  const [accounts, setAccounts] = useState<Record<string, AccountUtilities>>({});
  const value = accounts[key] ?? initial();
  const update = (change: (old: AccountUtilities) => AccountUtilities) => setAccounts(old => ({ ...old, [key]: change(old[key] ?? initial()) }));
  return { ...value,
    setShowBadge: (showBadge: boolean) => update(old => ({ ...old, showBadge })),
    setDraft: (draft: AccountUtilities['draft']) => update(old => ({ ...old, draft })),
    saveIssue: () => update(old => !old.draft.text.trim() ? old : ({ ...old, issues: [{ ...old.draft, text: old.draft.text.trim(), id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }, ...old.issues], draft: initial().draft })),
  };
}
const Context = createContext<ReturnType<typeof useUtilitiesState> | null>(null);
export function AccountUtilitiesProvider({ children }: PropsWithChildren) { const value = useUtilitiesState(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useAccountUtilities() { const value = useContext(Context); if (!value) throw new Error('AccountUtilitiesProvider missing'); return value; }
