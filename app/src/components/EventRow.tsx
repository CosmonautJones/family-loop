import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EventDateBadge } from './EventDateBadge';
import { StatusChip, type RsvpStatus } from './Chip';
import { fonts, palette, radii } from '../theme/tokens';

// One row, two feeds (Home "coming up" + Calendar agenda). The whole row is the
// tap target — no "Open event" button. Per redesign spec §6.
export function EventRow({
  title,
  meta,
  day,
  month,
  accent,
  status,
  onPress,
}: {
  title: string;
  meta: string;
  day: number | string;
  month: string;
  accent?: string;
  status?: RsvpStatus;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <EventDateBadge day={day} month={month} accent={accent} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        <Text numberOfLines={1} style={styles.meta}>{meta}</Text>
      </View>
      {status ? <StatusChip status={status} /> : <Ionicons name="chevron-forward" size={18} color={palette.faint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: 12,
    paddingHorizontal: 13,
    minHeight: 68,
  },
  pressed: { backgroundColor: '#FBF6F0' },
  copy: { flex: 1, minWidth: 0 },
  title: { color: palette.text, fontSize: 15.5, fontFamily: fonts.semibold, fontWeight: '600', letterSpacing: -0.2 },
  meta: { color: palette.muted, fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },
});
