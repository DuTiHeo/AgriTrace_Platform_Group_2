import { sharedStyles } from '@/styles/role-styles';
import { useState } from "react";
import { Image, Keyboard, Pressable, ScrollView } from "react-native";
import { FullScreenImageViewer } from "@/components/common/full-screen-image-viewer";

export function Photos({
  photos
}: {
  photos: string[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sharedStyles.photoList}
        keyboardShouldPersistTaps="handled"
      >
        {photos.map((uri, i) => (
          <Pressable
            key={`${uri}-${i}`}
            accessibilityLabel={`Xem ảnh ${i + 1}`}
            onPress={() => {
              Keyboard.dismiss();
              setSelected(uri);
            }}
          >
            <Image
              source={{ uri }}
              style={sharedStyles.photo}
            />
          </Pressable>
        ))}
      </ScrollView>

      <FullScreenImageViewer
        uri={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}