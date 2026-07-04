import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing } from '../theme/tokens';

const chipTones = {
  sage: { backgroundColor: 'rgba(170,197,177,0.28)', color: '#355442' },
  sky: { backgroundColor: 'rgba(198,217,246,0.42)', color: '#35527C' },
  coral: { backgroundColor: 'rgba(240,111,103,0.18)', color: '#9C3E44' },
} as const;

export type ChipTone = keyof typeof chipTones;

export type ChipProps = {
  label: string;
  tone?: ChipTone;
};

export function Chip({ label, tone = 'sage' }: ChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: chipTones[tone].backgroundColor }]}> 
      <Text style={[styles.text, { color: chipTones[tone].color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: 11,
  },
  text: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
  },
});
