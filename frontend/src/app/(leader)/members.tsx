import { useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useLeader } from '@/contexts/leader-context';
import { go } from '@/components/leader/ui';
import { sharedStyles as shared } from '@/styles/role-styles';
import { colors } from '@/styles/theme';

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
export default function MembersScreen() {
  const { members } = useLeader();
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const activeCount = members.filter(member => member.active).length;
  const search = normalize(query);
  const phoneSearch = query.replace(/[^\d+]/g, '');
  const visible = members.filter(member => member.active === activeOnly &&
    (!search || normalize(member.name).includes(search) || (!!phoneSearch && member.phone.replace(/[^\d+]/g, '').includes(phoneSearch))));

  return <SafeAreaView style={shared.page} edges={['top']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>
          <View style={s.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={10} style={s.back} onPress={() => { Keyboard.dismiss(); router.back(); }}>
              <Text style={s.backText}>‹</Text>
            </Pressable>
            <Text style={[shared.section, { flex: 1 }]}>Quản lý thành viên</Text>
          </View>
          <View style={s.filters}>
            <View style={s.search}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={19} tintColor={colors.muted} />
              <TextInput accessibilityLabel="Tìm theo tên hoặc số điện thoại công nhân" placeholder="Tìm tên hoặc số điện thoại công nhân…" placeholderTextColor={colors.muted}
                value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} style={s.searchInput} />
              {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" hitSlop={8} onPress={() => { Keyboard.dismiss(); setQuery(''); }}><Text style={shared.muted}>×</Text></Pressable>}
            </View>
            <View style={s.tabs}>
              {[{ active: true, title: 'Đang hoạt động', count: activeCount }, { active: false, title: 'Đã khóa', count: members.length - activeCount }].map(filter => (
                <Pressable key={filter.title} accessibilityRole="tab" accessibilityState={{ selected: activeOnly === filter.active }}
                  onPress={() => { Keyboard.dismiss(); setActiveOnly(filter.active); }} style={[s.filter, activeOnly === filter.active && s.selected]}>
                  <Text style={[s.filterText, activeOnly === filter.active && s.selectedText]}>{filter.title} ({filter.count})</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
      <FlatList data={visible} keyExtractor={member => member.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        contentContainerStyle={s.list}
        ListEmptyComponent={<View style={s.empty}><Text style={shared.empty}>{query.trim() ? 'Không tìm thấy thành viên phù hợp.' : activeOnly ? 'Chưa có thành viên đang hoạt động.' : 'Không có thành viên bị khóa.'}</Text></View>}
        renderItem={({ item: member }) => <Pressable accessibilityRole="button" accessibilityLabel={`Chỉnh sửa thông tin ${member.name}`}
          onPress={() => { Keyboard.dismiss(); go('member-detail', member.id); }} style={({ pressed }) => [s.card, pressed && { opacity: 0.65 }]}>
          <View style={s.avatar}><Text style={s.initials}>{member.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</Text></View>
          <View style={s.member}>
            <View style={s.nameRow}>
              <Text style={s.name}>{member.name}</Text>
              <View style={[s.badge, !member.active && s.inactiveBadge]}><Text style={[s.badgeText, !member.active && s.inactiveText]}>{member.active ? 'Hoạt động' : 'Đã khóa'}</Text></View>
            </View>
            <Text style={shared.muted}>Công nhân · {member.area}</Text>
            <Text style={shared.muted}>{member.phone}</Text>
          </View>
        </Pressable>} />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  header: { ...shared.header, gap: 10, paddingVertical: 12 },
  back: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 25, lineHeight: 28, color: colors.title },
  filters: { backgroundColor: colors.surface, padding: 16, gap: 10, borderBottomWidth: 1, borderColor: colors.border },
  search: { ...shared.input, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 0 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 46, fontSize: 12, color: colors.text },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  selectedText: { color: colors.white },
  list: { padding: 16, paddingBottom: 35, gap: 10, flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  member: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  name: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.title },
  badge: { backgroundColor: colors.successSoft, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '700', color: colors.success },
  inactiveBadge: { backgroundColor: colors.warningSoft },
  inactiveText: { color: colors.warning },
  empty: { ...shared.card },
});
