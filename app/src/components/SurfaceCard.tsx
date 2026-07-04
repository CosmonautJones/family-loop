import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing } from '../theme/tokens';

export type SurfaceCardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  aside?: ReactNode;
}>;

export function SurfaceCard({ title, subtitle, aside, children }: SurfaceCardProps) {
  return (
    <View style={styles.card}>
      {(title || aside) && (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {aside}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
