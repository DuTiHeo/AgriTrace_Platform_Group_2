import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReports } from '@/contexts/report-context';
import { sharedStyles as s } from '@/styles/role-styles';
import { colors } from '@/styles/theme';

export function JournalFilterOptions<T extends string>({ label, value, options, onChange, alignRight = false }: {
  label: string;
  value: T;
  options: {
    value: T;
    label: string
  }[];
  onChange: (value: T) => void;
  alignRight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(item => item.value === value)?.label ?? 'Chưa có khu vực';

  return <View style={[
    styles.filter,
    open && styles.open
  ]}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${selected}`}
      accessibilityState={{
        expanded: open
      }}
      onPress={() => setOpen(current => !current)}
      style={[
        s.secondary,
        styles.trigger,
        {
          borderColor: colors.primary
        }
      ]}
    >
      <Text
        numberOfLines={1}
        style={s.link}
      >
        {selected}
      </Text>
    </Pressable>
    {open && <View style={[
      styles.menu,
      alignRight ? {
        right: 0
      } : {
        left: 0
      }
    ]}>
      <ScrollView
        nestedScrollEnabled
        style={{
          maxHeight: 278
        }}
      >
        {options.map((item, index) => <Pressable
          key={item.value}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${item.label}`}
          accessibilityState={{
            selected: value === item.value
          }}
          onPress={() => {
            onChange(item.value);
            setOpen(false);
          }}
          style={[
            styles.option,
            index < options.length - 1 && styles.optionBorder,
            value === item.value && {
              backgroundColor: colors.primarySoft
            }
          ]}
        >
          <Text style={value === item.value ? s.link : s.muted}>
            {item.label}
          </Text>
          {value === item.value && <Text style={s.link}>✓</Text>}
        </Pressable>)}
      </ScrollView>
    </View>}
  </View>;
}

export function AreaJournalFilter({ allowAll = false }: {
  allowAll?: boolean
}) {
  const { seasons, selectedSeasonId, selectSeason, seasonsError } = useReports();
  const areas = [...new Map(seasons.map(season => [
    season.plot_id,
    season
  ])).values()];
  const options = [
    ...(allowAll ? [{
      value: 'all',
      label: 'Tất cả khu vực'
    }] : []),
    ...areas.map(area => ({
      value: `plot:${area.plot_id}`,
      label: area.plot_code
    })),
  ];

  return <View style={{
    gap: 8,
    zIndex: 30,
    maxWidth: 190,
    marginLeft: 'auto'
  }}>
    <JournalFilterOptions
      label="Khu vực"
      value={selectedSeasonId ?? ''}
      options={options}
      onChange={selectSeason}
      alignRight
    />
    {!!seasonsError && <Text
      accessibilityRole="alert"
      style={{
        color: colors.danger
      }}
    >
      {seasonsError}
    </Text>}
    {!seasonsError && !areas.length && <Text style={s.muted}>Chưa có khu vực.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  filter: {
    position: 'relative',
    zIndex: 10
  },
  open: {
    zIndex: 100
  },
  trigger: {
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  menu: {
    position: 'absolute',
    top: '100%',
    marginTop: 5,
    minWidth: 170,
    maxWidth: 245,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
    overflow: 'hidden',
    elevation: 0
  },
  option: {
    minHeight: 43,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
});
