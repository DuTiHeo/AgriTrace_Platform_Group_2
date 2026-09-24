import { RoleBottomNav, type RoleNavProps, type NavItem } from '@/components/common/role-bottom-nav';

const items = [
  {
    route: 'index',
    label: 'Trang chủ',
    icon: {
      ios: 'house',
      android: 'home',
      web: 'home'
    }
  },
  {
    route: 'assignments',
    label: 'Giao việc',
    icon: {
      ios: 'checklist',
      android: 'checklist',
      web: 'checklist'
    }
  },
  {
    route: 'diary',
    label: 'Nhật ký',
    icon: {
      ios: 'book.closed',
      android: 'menu_book',
      web: 'menu_book'
    }
  },
  {
    route: 'members',
    label: 'Thành viên',
    icon: {
      ios: 'person.2',
      android: 'group',
      web: 'group'
    }
  },
  {
    route: 'profile',
    label: 'Cá nhân',
    icon: {
      ios: 'person.crop.circle',
      android: 'account_circle',
      web: 'account_circle'
    }
  },
] as const satisfies readonly NavItem[];

export function LeaderBottomNav(props: RoleNavProps) {
  return <RoleBottomNav {...props} items={items} />;
}
