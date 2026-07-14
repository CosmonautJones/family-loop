import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { palette, radii, shadow } from '../theme/tokens';
import { useReducedMotion } from './useReducedMotion';

export function SurfaceCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const reduceMotion = useReducedMotion();

  return (
    <MotiView from={reduceMotion ? { opacity: 1, translateY: 0 } : { opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: reduceMotion ? 0 : 360 }}>
      <View style={[styles.card, style]}>{children}</View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    ...shadow.soft,
  },
});
