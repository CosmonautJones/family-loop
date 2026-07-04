import { StyleSheet, Text, View } from 'react-native';
import { palette, radii } from '../theme/tokens';

type ChipTone = 'sage' | 'sky' | 'coral';

const tones = {
  sage: { backgroundColor: 'rgba(170,197,177,0.28)', color: '#355442' },
  sky: { backgroundColor: 'rgba(198,217,246,0.42)', color: '#35527C' },
  coral: { backgroundColor: 'rgba(240,111,103,0.18)', color: '#9C3E44' },
} as const;

export function Chip({ label, tone = 'sage' }: { label: string; tone?: ChipTone }) {
  return (
    <View style={[styles.chip, { backgroundColor: tones[tone].backgroundColor }]}>
      <Text style={[styles.text, { color: tones[tone].color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 11,
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
});
