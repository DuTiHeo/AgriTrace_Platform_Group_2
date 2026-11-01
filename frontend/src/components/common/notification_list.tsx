import { useAuth } from '@/contexts/auth_context';
import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type AppNotice, useNotifications } from '@/contexts/notification_context';
import { getNotificationFilters } from '@/sevices/mobile_notifications';
import { sharedStyles as shared } from '@/styles/role_styles';
import { colors } from '@/styles/theme';
import { Button } from './role_ui';

const accents = { work: colors.primary, schedule: '#3284D4', alert: colors.danger };

export function NotificationList() {
  const { user } = useAuth();
  const notificationFilters = getNotificationFilters(user?.role);
  const { notices, ready, loading, error, actionError, busy, unread, readIds, markRead, markAllRead, refresh, filter, setFilter } = useNotifications();
  const [selected, setSelected] = useState<AppNotice | null>(null);
  const [listHeight, setListHeight] = useState(0);
  const { fontScale } = useWindowDimensions();
  const cardHeight = Math.max(Math.ceil(64 * Math.max(1, fontScale)), Math.floor((listHeight - 24 - 7 * 8) / 8));
  const visible = [...notices].sort((a, b) => (Date.parse(b.occurredAt ?? '') || 0) - (Date.parse(a.occurredAt ?? '') || 0));
  const close = () => setSelected(null);

  return <SafeAreaView style={shared.page} edges={['top', 'bottom']}>
    <View style={s.top}>
      <View style={shared.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={10} onPress={() => router.back()}>
          <Text style={shared.backText}>‹</Text>
        </Pressable>
        <Text style={[shared.title, { flex: 1 }]}>Thông báo</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Đánh dấu tất cả thông báo đã đọc"
          disabled={!unread || !ready || busy} onPress={() => { void markAllRead(); }}
          style={[s.readButton, (!unread || busy) && { opacity: 0.5 }]}>
          <Text style={s.readText}>{busy ? 'Đang cập nhật…' : 'Đọc tất cả'}</Text>
        </Pressable>
      </View>
      <View style={s.filters}>
        {notificationFilters.map(item => <Pressable key={item.value} accessibilityRole="tab"
          accessibilityState={{ selected: filter === item.value, disabled: busy }} disabled={busy}
          onPress={() => setFilter(item.value)} style={[s.filter, filter === item.value && s.selected]}>
          <Text style={[s.filterText, filter === item.value && { color: colors.white }]}>{item.label}</Text>
        </Pressable>)}
      </View>
      {!!error && <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>
        <Button title="Thử lại" disabled={loading} onPress={() => { void refresh(); }} /></View>}
      {!!actionError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{actionError}</Text>}
    </View>
    <FlatList data={ready ? visible : []} keyExtractor={notice => notice.id} contentContainerStyle={s.list}
      style={{ flex: 1 }} onLayout={event => setListHeight(event.nativeEvent.layout.height)} initialNumToRender={8}
      refreshing={loading && ready} onRefresh={() => { void refresh(); }}
      ListEmptyComponent={!ready ? <ActivityIndicator color={colors.primary} /> : !error ? <Text style={shared.empty}>
        {filter === 'all' ? 'Chưa có thông báo.' : 'Chưa có thông báo thuộc loại này.'}
      </Text> : undefined}
      renderItem={({ item }) => {
        const isUnread = !readIds.includes(item.id);
        return <Pressable accessibilityRole="button" disabled={busy}
          accessibilityLabel={`${item.title}. ${item.text}. ${isUnread ? 'Chưa đọc' : 'Đã đọc'}`}
          onPress={() => { setSelected(item); if (isUnread) void markRead(item.id); }}
          style={({ pressed }) => [s.card, { height: cardHeight }, !isUnread && { backgroundColor: colors.header }, pressed && { opacity: 0.7 }]}>
          <View style={[s.bar, { backgroundColor: accents[item.category] }]} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[s.title, isUnread && { fontWeight: '800' }]}>{item.title}</Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={shared.muted}>{item.text}</Text>
          </View>
          <View style={[s.meta, { width: 96, maxWidth: 96 }]}>
            {isUnread && <View style={s.dot} />}
            <Text numberOfLines={2} style={s.time}>{item.timeLabel}</Text>
          </View>
        </Pressable>;
      }} />
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.24)' }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: 5, padding: 20, gap: 16, maxHeight: '80%' }}>
          <Text style={shared.section}>{selected?.title}</Text>
          <Text style={shared.muted}>{selected?.timeLabel}</Text>
          <ScrollView><Text style={shared.body}>{selected?.text}</Text></ScrollView>
          {!!actionError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{actionError}</Text>}
          {selected && !readIds.includes(selected.id) && <Button secondary title="Đánh dấu đã đọc" disabled={busy} onPress={() => { void markRead(selected.id); }} />}
          {selected?.target && <Button title="Xem thông tin liên quan" onPress={() => {
            const target = selected.target;
            close();
            if (target) router.push(target);
          }} />}
          <Button secondary title="Đóng" onPress={close} />
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  top: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  readButton: {
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    padding: 7
  },
  readText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700'
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterText: {
    color: colors.text,
    fontSize: 12
  },
  list: {
    padding: 12,
    gap: 8,
    flexGrow: 1
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  bar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 3
  },
  title: {
    color: colors.title,
    fontSize: 13,
    fontWeight: '600'
  },
  meta: {
    maxWidth: 76,
    alignItems: 'flex-end',
    gap: 7
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E88924'
  },
  time: {
    color: colors.muted,
    fontSize: 10,
    textAlign: 'right'
  },
});
