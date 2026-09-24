import { Keyboard, Pressable, Text, View } from "react-native";
import { areas } from "@/contexts/leader-context";
import { s } from "./ui";

export function AreaPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.label}>
        Khu vực làm việc
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        {areas.map(area => (
          <Pressable
            key={area}
            onPress={() => {
              Keyboard.dismiss();
              onChange(area);
            }}
            style={{
              borderRadius: 10,
              padding: 10,
              backgroundColor: value === area ? '#E0F0DF' : '#F6F8F6',
              borderWidth: 1,
              borderColor: value === area ? '#80B47C' : '#E4EBE4'
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#35583C'
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