// Bảng màu và kích thước dùng chung cho worker và leader.
export const colors = {
  background: '#F4F8F5', surface: '#FFFFFF', header: '#FAFCFA',
  primary: '#2E833D', primaryText: '#2B823F', primarySoft: '#EFF6EF',
  title: '#213D29', text: '#27412F', muted: '#829487',
  border: '#E4ECE5', inputBorder: '#E0E8E1', input: '#F9FBF9',
  divider: '#F0F3F0', success: '#278046', successSoft: '#EAF6EB',
  warning: '#A66B16', warningSoft: '#FFF2DC',
  danger: '#D93535', dangerBorder: '#E64A4A', dangerSoft: '#FFF1F1',
  navInactive: '#728273', capture: '#00A947', white: '#FFFFFF',
} as const;
export const radius = { card: 20, control: 13, chip: 8, avatar: 18 } as const;
export const spacing = { page: 20, section: 18, card: 17, row: 12 } as const;
