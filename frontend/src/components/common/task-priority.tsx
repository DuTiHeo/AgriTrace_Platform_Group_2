import { Keyboard, Pressable, Text, View } from 'react-native';
import { sharedStyles as s } from '@/styles/role-styles';
import { colors } from '@/styles/theme';
export type TaskPriority = 'high' | 'medium' | 'low';
export const priorityLabels: Record<TaskPriority, string> = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
export const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
export function PriorityBadge({ priority = 'medium' }: { priority?: TaskPriority }) {
  const color = priority === 'high' ? colors.danger : priority === 'medium' ? '#276DB5' : colors.success;
  const backgroundColor = priority === 'high' ? colors.dangerSoft : priority === 'medium' ? '#EAF3FF' : colors.successSoft;
  return <View style={[s.chip, { backgroundColor }]}><Text style={{ color, fontSize: 11, fontWeight: '700' }}>{priorityLabels[priority]}</Text></View>;
}
export function PriorityPicker({ value, onChange }: { value: TaskPriority; onChange: (value: TaskPriority) => void }) {
  return <View style={{ gap: 8 }}><Text style={s.label}>Mức độ ưu tiên</Text>
    <View style={[s.row, { flexWrap: 'wrap' }]}>{(Object.keys(priorityLabels) as TaskPriority[]).map(priority =>
      <Pressable key={priority} accessibilityRole="radio" accessibilityLabel={`Ưu tiên ${priorityLabels[priority]}`} accessibilityState={{ checked: value === priority }}
        onPress={() => { Keyboard.dismiss(); onChange(priority); }}
        style={[s.secondary, { padding: 9, borderRadius: 13, borderColor: value === priority ? colors.primary : colors.border, borderWidth: value === priority ? 2 : 1 }]}>
        <PriorityBadge priority={priority} />
      </Pressable>)}</View>
  </View>;
}
