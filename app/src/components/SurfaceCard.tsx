import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { palette, radii } from '../theme/tokens';

export function SurfaceCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    padding: 18,
    gap: 14,
  },
});
