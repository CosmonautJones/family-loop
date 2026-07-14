import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, shadow } from '../theme/tokens';
import { useReducedMotion } from './useReducedMotion';

export function Avatar({ uri, initials, size = 34 }: { uri?: string; initials: string; size?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <View accessible={false} style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image accessible={false} source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={reduceMotion ? 0 : 220} />
      ) : (
        <Text style={styles.initials}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: palette.peach,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.84)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.soft,
  },
  initials: {
    color: palette.plum,
    fontSize: 12,
    fontWeight: '900',
  },
});
