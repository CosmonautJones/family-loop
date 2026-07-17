import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { palette } from '../theme/tokens';

// Flat porcelain canvas. Warmth comes from photos and event covers, not the background.
export function AppBackground({ children }: PropsWithChildren) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: palette.bg,
  },
});
