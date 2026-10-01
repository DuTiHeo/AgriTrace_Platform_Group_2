import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type AppNotice, type NoticeCategory, useNotificationRead } from '@/contexts/notification-context';
import { sharedStyles as shared } from '@/styles/role-styles';
import { colors } from '@/styles/theme';
import { Button } from './role-ui';
const filters = [
  {
    id: 'all',
    label: 'Tất cả'
  },
  {
    id: 'work',
    label: 'Công việc'
  },
  {
    id: 'schedule',
    label: 'Lịch'
  },
  {
    id: 'alert',
    label: 'Cảnh báo'
  }
] as const;
const accents = {
  work: colors.primary,
  schedule: '#3284D4',
  alert: colors.danger
};

export function NotificationList({ notices, ready = true, error = '', onRetry }: {
  notices: AppNotice[];
  ready?: boolean;
  error?: string;
  onRetry?: () => void
}) {
  const [filter, setFilter] = useState<'all' | NoticeCategory>('all');
  const [listHeight, setListHeight] = useState(0);
  const { fontScale } = useWindowDimensions();
  const cardHeight = Math.max(Math.ceil(64 * Math.max(1, fontScale)), Math.floor((listHeight - 24 - 7 * 8) / 8));
  const { readIds, markRead } = useNotificationRead();
  const visible = notices.filter(notice => filter === 'all' || notice.category === filter)
    .sort((a, b) => (Date.parse(b.occurredAt ?? '') || 0) - (Date.parse(a.occurredAt ?? '') || 0));
  const unread = notices.filter(notice => !readIds.includes(notice.id));

  return <SafeAreaView
    style={shared.page}
    edges={[
      'top',
      'bottom'
    ]}
  >
    <View style={s.top}>
      <View style={shared.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={10}
          onPress={() => router.back()}
        >
          <Text style={shared.backText}>‹</Text>
        </Pressable>
        <Text style={[
          shared.title,
          {
            flex: 1
          }
        ]}>Thông báo</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đánh dấu tất cả thông báo đã đọc"
          disabled={!unread.length || !ready || !!error}
          onPress={() => markRead(notices.map(n => n.id))}
          style={[
            s.readButton,
            !unread.length && {
              opacity: 0.5
            }
          ]}
        >
          <Text style={s.readText}>Đánh dấu đã đọc</Text>
        </Pressable>
      </View>
      <View style={s.filters}>
        {filters.map(item => <Pressable
          key={item.id}
          accessibilityRole="tab"
          accessibilityState={{
            selected: filter === item.id
          }}
          onPress={() => setFilter(item.id)}
          style={[
            s.filter,
            filter === item.id && s.selected
          ]}
        >
          <Text style={[
            s.filterText,
            filter === item.id && {
              color: colors.white
            }
          ]}>
            {item.label}
          </Text>
        </Pressable>)}
      </View>
    </View>
    <FlatList
      data={ready && !error ? visible : []}
      keyExtractor={notice => notice.id}
      contentContainerStyle={s.list}
      style={{
        flex: 1
      }}
      onLayout={event => setListHeight(event.nativeEvent.layout.height)}
      initialNumToRender={8}
      ListEmptyComponent={error ? <View style={shared.card}>
        <Text
          accessibilityRole="alert"
          style={{
            color: colors.danger
          }}
        >
          {error}
        </Text>
        {onRetry && <Button
          title="Thử lại"
          onPress={onRetry}
        />}
      </View> : !ready ? <ActivityIndicator color={colors.primary} /> : <Text style={shared.empty}>
        {filter === 'all' ? 'Chưa có thông báo.' : 'Chưa có thông báo thuộc nhóm này.'}
      </Text>}
      renderItem={({ item }) => {
        const isUnread = !readIds.includes(item.id);

        return <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.text}. ${isUnread ? 'Chưa đọc' : 'Đã đọc'}`}
          onPress={() => {
            markRead([item.id]);
            router.push(item.target);
          }}
          style={({ pressed }) => [
            s.card,
            {
              height: cardHeight
            },
            !isUnread && {
              backgroundColor: colors.header
            },
            pressed && {
              opacity: 0.7
            }
          ]}
        >
          <View style={[
            s.bar,
            {
              backgroundColor: accents[item.category]
            }
          ]} />
          <View style={{
            flex: 1,
            minWidth: 0,
            gap: 4
          }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                s.title,
                isUnread && {
                  fontWeight: '800'
                }
              ]}
            >
              {item.title}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={shared.muted}
            >
              {item.text}
            </Text>
          </View>
          <View style={[
            s.meta,
            {
              width: 96,
              maxWidth: 96
            }
          ]}>
            {isUnread && <View style={s.dot} />}
            <Text
              numberOfLines={2}
              style={s.time}
            >
              {item.timeLabel}
            </Text>
          </View>
        </Pressable>;
      }}
    />
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
