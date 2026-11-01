import { useState } from 'react';
import { Image, Keyboard, Pressable, ScrollView, Text } from 'react-native';
import { sharedStyles } from '@/styles/role-styles';
import { FullScreenImageViewer } from './full-screen-image-viewer';

export function ReportPhotos({ photos, emptyText, labelPrefix = 'Xem ảnh' }: {
  photos: string[];
  emptyText?: string;
  labelPrefix?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return <>
    {!photos.length && emptyText ? <Text style={sharedStyles.muted}>{emptyText}</Text> : <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={sharedStyles.photoList}
    >
      {photos.map((uri, index) => <Pressable
        key={`${uri}-${index}`}
        accessibilityLabel={`${labelPrefix} ${index + 1}`}
        onPress={() => {
          Keyboard.dismiss();
          setSelected(uri);
        }}
      >
        <Image source={{ uri }} style={sharedStyles.photo} />
      </Pressable>)}
    </ScrollView>}
    <FullScreenImageViewer uri={selected} onClose={() => setSelected(null)} />
  </>;
}
