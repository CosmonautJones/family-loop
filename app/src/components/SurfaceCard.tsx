import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radii, shadow } from '../theme/tokens';

export function SurfaceCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
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
