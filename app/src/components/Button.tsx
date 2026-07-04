import { Pressable, StyleSheet, Text } from 'react-native';
import { palette, radii } from '../theme/tokens';

type ButtonTone = 'primary' | 'secondary';

export function Button({ label, tone = 'primary' }: { label: string; tone?: ButtonTone }) {
  return (
    <Pressable style={[styles.base, tone === 'primary' ? styles.primary : styles.secondary]}>
      <Text style={[styles.text, tone === 'primary' ? styles.primaryText : styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: '#fff',
  },
  secondary: {
    borderColor: 'rgba(255,255,255,0.24)',
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
});
