import { type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navStyles as s } from '@/styles/navigation';
import { colors } from '@/styles/theme';

export type NavItem = { route: string; label: string; icon: ComponentProps<typeof SymbolView>['name']; primary?: boolean };
export type RoleNavProps = {
  state: { index: number; routes: Array<{ name: string; key: string }> };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
  };
};
export function RoleBottomNav({ state, navigation, items }: RoleNavProps & { items: readonly NavItem[] }) {
  const insets = useSafeAreaInsets();
  const selected = state.routes[state.index]?.name;
  if (!items.some(item => item.route === selected)) return null;
  return <View style={[s.nav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
    {items.map(item => {
      const active = selected === item.route;
      const color = active || item.primary ? colors.primary : colors.navInactive;
      return <Pressable key={item.route} accessibilityRole="tab" accessibilityLabel={item.label}
        accessibilityState={{ selected: active }} style={({ pressed }) => [s.item, pressed && { opacity: 0.6 }]}
        onPress={() => {
          Keyboard.dismiss();
          const route = state.routes.find(value => value.name === item.route);
          if (!route) return;
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!event.defaultPrevented && !active) navigation.navigate(item.route);
        }}>
        {item.primary ? <View style={s.primaryCircle}><SymbolView name={item.icon} size={27} tintColor={colors.white} /></View>
          : <View style={s.icon}><SymbolView name={item.icon} size={25} tintColor={color} /></View>}
        <Text style={[s.label, { color }, (active || item.primary) && s.activeLabel]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}
