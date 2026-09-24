import { RoleBottomNav, type RoleNavProps, type NavItem } from '@/components/common/role-bottom-nav';

const items = [
  { label: 'Trang chủ', route: 'index', icon: { ios: 'house.fill', android: 'home', web: 'home' }, primary: false },
  { label: 'Nhật ký', route: 'diary', icon: { ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' }, primary: false },
  { label: 'Ghi mới', route: 'create-log', icon: { ios: 'plus', android: 'add', web: 'add' }, primary: true },
  { label: 'Lịch làm việc', route: 'schedule', icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }, primary: false },
  { label: 'Cá nhân', route: 'profile', icon: { ios: 'person.fill', android: 'person', web: 'person' }, primary: false },
] as const satisfies readonly NavItem[];

export function WorkerBottomNav(props: RoleNavProps) {
  return <RoleBottomNav {...props} items={items} />;
}
