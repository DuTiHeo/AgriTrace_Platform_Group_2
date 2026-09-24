import { Text } from "react-native";

export function Feedback({
  text
}: {
  text: string;
}) {
  return text ? (
    <Text
      accessibilityRole="alert"
      style={{
        color: '#906033',
        fontSize: 13,
        lineHeight: 20
      }}
    >
      {text}
    </Text>
  ) : null;
}