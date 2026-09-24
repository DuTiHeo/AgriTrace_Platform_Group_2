import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from './theme';

// Khối, chữ, ô nhập và nút theo giao diện leader; dùng cho cả hai vai trò.
export const sharedStyles = StyleSheet.create({
  photo: { width: 128, height: 100, borderRadius: radius.control },
  photoList: { gap: 10 },
  statCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: 14, gap: 7 },
  statNumber: { color: colors.primary, fontSize: 26, fontWeight: '800' },

  dangerButton: { backgroundColor: colors.surface, borderColor: colors.dangerBorder, borderWidth: 1.5, borderRadius: radius.control, minHeight: 48, padding: 14, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  body: { color: colors.text, fontSize: 14, lineHeight: 22 },
  chipText: { color: colors.success, fontSize: 11, fontWeight: '700' },

  page: {
    flex: 1,
    backgroundColor: colors.background
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: '#E9EFEA'
  },

  content: {
    padding: spacing.page,
    gap: spacing.section,
    paddingBottom: 35
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.title,
    letterSpacing: -0.5
  },

  section: {
    fontSize: 16,
    fontWeight: '800',
    color: '#243E2B'
  },

  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.title,
    marginTop: 3
  },

  muted: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#E4F0DD',
    alignItems: 'center',
    justifyContent: 'center'
  },

  avatarText: {
    color: '#42713B',
    fontWeight: '800',
    fontSize: 15
  },

  bell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },

  badge: {
    position: 'absolute',
    right: -2,
    top: -3,
    backgroundColor: '#DE655E',
    borderRadius: 10,
    minWidth: 17,
    alignItems: 'center'
  },

  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
    padding: 2
  },


  card: {
    backgroundColor: colors.surface,
    padding: spacing.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: '#2F5036',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3
    },
    elevation: 1
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },

  link: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 12
  },

  button: {
    backgroundColor: colors.primary,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center'
  },

  buttonText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 13
  },

  secondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#DCEADC'
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C5543'
  },

  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 13,
    borderRadius: radius.control,
    fontSize: 14,
    color: colors.text,
    minHeight: 48
  },

  chip: {
    borderRadius: 8,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'flex-start'
  },

  empty: {
    color: '#86968A',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 20
  },

  infoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.divider
  },

  value: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: '#304C37'
  },

  back: {
    width: 28
  },

  backText: {
    fontSize: 34,
    color: '#294A30'
  },

  overlay: {
    flex: 1,
    backgroundColor: '#102C2266',
    justifyContent: 'center',
    padding: 24
  },

  calendar: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    gap: 16
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },

  day: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    paddingVertical: 12
  },

  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12
  },
});