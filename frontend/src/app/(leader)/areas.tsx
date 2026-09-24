import { Text, View } from "react-native";
import { areas } from "@/contexts/leader-context";
import { Card, Chip, Screen, s } from "@/components/leader/ui";

export default function AreasScreen() {
  return (
    <Screen title="Vùng trồng quản lý" back>
      <Text style={s.muted}>
        Danh sách vùng trồng để lựa chọn khi giao việc.
      </Text>

      {areas.map((a, i) => (
        <Card key={a}>
          <View style={s.row}>
            <Text style={{ fontSize: 24 }}>🌱</Text>

            <View style={{ flex: 1 }}>
              <Text style={s.section}>{a}</Text>

              <Text style={s.muted}>
                {['Rau cải', 'Rau ăn lá', 'Cây ăn quả', 'Rau theo mùa'][i]}
              </Text>
            </View>

            <Chip text="Hoạt động" />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
