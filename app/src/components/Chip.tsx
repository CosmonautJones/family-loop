import { StyleSheet, Text, View } from 'react-native';
import { fonts, palette, radii, statusChip } from '../theme/tokens';

import type { AccentTone } from '../types/ui';

// Calmed to the redesign system: soft neutral pills, one weight, no shouting.
const tones = {
  sage: { backgroundColor: statusChip.going.bg, color: statusChip.going.fg },
  sky: { backgroundColor: 'rgba(113,54,93,0.10)', color: palette.plum },
  coral: { backgroundColor: statusChip.maybe.bg, color: statusChip.maybe.fg },
} as const;

export function Chip({ label, tone = 'sage' }: { label: string; tone?: AccentTone }) {
  return (
    <View style={[styles.chip, { backgroundColor: tones[tone].backgroundColor }]}>
      <Text style={[styles.text, { color: tones[tone].color }]}>{label}</Text>
    </View>
  );
}

export type RsvpStatus = 'going' | 'maybe' | 'cantGo' | 'pending';

const STATUS_LABEL: Record<RsvpStatus, string> = {
  going: 'Going',
  maybe: 'Maybe',
  cantGo: 'Can’t go',
  pending: 'RSVP',
};

export function StatusChip({ status, label }: { status: RsvpStatus; label?: string }) {
  const c = statusChip[status];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label ?? STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11.5,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
