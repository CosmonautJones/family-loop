import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { gradients, palette } from '../theme/tokens';

export function AppBackground({ children }: PropsWithChildren) {
  return (
    <LinearGradient colors={gradients.app} style={styles.root} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  glowOne: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(240,111,103,0.22)',
  },
  glowTwo: {
    position: 'absolute',
    bottom: 80,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(113,54,93,0.14)',
  },
});
