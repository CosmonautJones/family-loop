import { Pressable, StyleSheet, Text } from 'react-native';
import { palette, radii } from '../theme/tokens';

import type { ButtonTone } from '../types/ui';

export function Button({ label, tone = 'primary', onPress }: { label: string; tone?: ButtonTone; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.base,
        tone === 'primary' ? styles.primary : tone === 'ghost' ? styles.ghost : styles.secondary,
      ]}
    >
      <Text
        style={[
          styles.text,
          tone === 'primary' ? styles.primaryText : tone === 'ghost' ? styles.ghostText : styles.secondaryText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    minHeight: 48,
    paddingVertical: 11,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#fff',
  },
  secondary: {
    borderColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
  },
  text: {
    fontWeight: '800',
  },
  primaryText: {
    color: palette.plum,
  },
  secondaryText: {
    color: '#fff',
  },
  ghostText: {
    color: '#fff',
  },
});
