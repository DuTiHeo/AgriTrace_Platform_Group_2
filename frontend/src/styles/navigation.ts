import { StyleSheet } from 'react-native';
import { colors } from './theme';

// Thanh nav theo worker, có hỗ trợ nút chụp/ghi mới nổi và vùng an toàn đáy máy.
export const navStyles = StyleSheet.create({
  nav: { backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 10 },
  item: { flex: 1, minHeight: 46, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  icon: { height: 27, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  activeLabel: { fontWeight: '800' },
  primaryCircle: { width: 52, height: 52, marginTop: -30, borderRadius: 27, backgroundColor: colors.capture, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: colors.surface, shadowColor: colors.title, shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
});
