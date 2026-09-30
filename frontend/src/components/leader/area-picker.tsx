import { Keyboard, Pressable, Text, View } from "react-native";
import { s } from "./ui";

export function AreaPicker({
  value,
  onChange,
  options = [],
  label = 'Khu vực làm việc',
}: {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  label?: string;
}) {
  return (
    <View style={{ gap: 13 }}>
      <Text style={s.label}>
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 6,
          rowGap: 9
        }}
      >
        {options.map(area => (
          <Pressable
            key={area}
            onPress={() => {
              Keyboard.dismiss();
              onChange(area);
            }}
            style={{
              borderRadius: 0,
              minHeight: 40,
              flexBasis: '18%',
              flexGrow: 1,
              maxWidth: '19%',
              paddingHorizontal: 6,
              paddingVertical: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: value === area ? '#E0F0DF' : '#F6F8F6',
              borderWidth: 1,
              borderColor: value === area ? '#80B47C' : '#E4EBE4'
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#35583C',
                textAlign: 'center'
              }}
            >
              {area}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
