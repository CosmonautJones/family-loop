import { StyleSheet, Text, View } from 'react-native';
import { accentOf, fonts } from '../theme/tokens';

// Month-over-day badge tinted by the event's accent. Shared by Home + Calendar agenda rows.
export function EventDateBadge({ day, month, accent }: { day: number | string; month: string; accent?: string }) {
  const a = accentOf(accent);
  return (
    <View style={[styles.badge, { backgroundColor: a.tint }]}>
      <Text style={[styles.mon, { color: a.deep }]}>{month}</Text>
      <Text style={styles.day}>{day}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { width: 44, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mon: { fontSize: 9.5, fontFamily: fonts.bold, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  day: { fontSize: 17, fontFamily: fonts.bold, fontWeight: '700', color: '#26161C', marginTop: 1 },
});
