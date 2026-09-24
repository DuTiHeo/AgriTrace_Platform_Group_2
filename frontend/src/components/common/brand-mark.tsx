import { StyleSheet, Text, View } from 'react-native';

type BrandMarkProps = {
  size?: number
};

export function BrandMark({ size = 76 }: BrandMarkProps) {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28
        }
      ]}
    >
      <Text
        style={[
          styles.leaf,
          { fontSize: size * 0.5 }
        ]}
      >
        ⌁
      </Text>

      <View
        style={[
          styles.stem,
          { height: size * 0.3 }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#172617',
    shadowOpacity: 0.17,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 5
  },

  leaf: {
    color: '#2F8437',
    fontWeight: '700',
    lineHeight: 30,
    transform: [
      { rotate: '-30deg' }
    ]
  },

  stem: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#2F8437',
    borderRadius: 2,
    transform: [
      { rotate: '40deg' },
      { translateY: 5 }
    ]
  },
});