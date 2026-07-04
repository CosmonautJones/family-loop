import { Pressable, StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';

import { palette, radii, spacing } from '../theme/tokens';

export type ButtonProps = {
  label: string;
  variant?: 'primary' | 'secondary';
  onPress?: () => void;
  icon?: ReactNode;
};

export function Button({ label, variant = 'primary', onPress, icon }: ButtonProps) {
  return (
    <Pressable style={[styles.base, variant === 'primary' ? styles.primary : styles.secondary]} onPress={onPress}>
      {icon}
      <Text style={variant === 'primary' ? styles.primaryText : styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  primary: {
    backgroundColor: palette.white,
  },
  secondary: {
    borderColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
  },
  primaryText: {
    color: palette.plum,
    fontWeight: '800',
  },
  secondaryText: {
    color: palette.white,
    fontWeight: '700',
  },
});
