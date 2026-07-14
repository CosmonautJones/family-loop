import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useActiveEventsQuery, useActiveGroupMembersQuery, useActiveGroupQuery } from '../app/queries';
import { selectFamilyViewModel } from '../app/selectors';
import { Button } from '../components/Button';
import { SurfaceCard } from '../components/SurfaceCard';
import { palette, spacing } from '../theme/tokens';

export function GroupsScreen() {
  const { width } = useWindowDimensions();
  const groupQuery = useActiveGroupQuery();
  const membersQuery = useActiveGroupMembersQuery();
  const eventsQuery = useActiveEventsQuery();
  const loading = groupQuery.isPending || membersQuery.isPending || eventsQuery.isPending;
  const error = groupQuery.error ?? membersQuery.error ?? eventsQuery.error;
  const retry = () => Promise.all([groupQuery.refetch(), membersQuery.refetch(), eventsQuery.refetch()]);

  if (loading) {
    return <View style={styles.state} accessibilityLiveRegion="polite"><ActivityIndicator color={palette.plum} /><Text style={styles.stateTitle}>Loading your family…</Text></View>;
  }
  if (error) {
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        <Text style={styles.stateTitle}>We couldn't load your family.</Text>
        <Text style={styles.cardCopy}>{error instanceof Error ? error.message : 'Please try again.'}</Text>
        <Button label="Try again" onPress={retry} />
      </View>
    );
  }
  if (!groupQuery.data) {
    return <View style={styles.state}><Text style={styles.stateTitle}>No active family yet.</Text><Text style={styles.cardCopy}>Your family details will appear here when you join one.</Text></View>;
  }

  const family = selectFamilyViewModel(groupQuery.data, membersQuery.data ?? [], eventsQuery.data ?? []);
  return (
    <ScrollView contentContainerStyle={[styles.container, { width: Math.max(width - (2 * spacing.lg), 0) }]}>
      <Text style={styles.eyebrow}>Your family</Text>
      <Text style={styles.title}>{family.name}</Text>
      <Text style={styles.subtitle}>{family.description}</Text>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Family at a glance</Text>
        <Text style={styles.summary}>{family.memberCountLabel}</Text>
        <Text style={styles.cardCopy}>{family.upcomingLabel}</Text>
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>People</Text>
        {family.members.length === 0 ? (
          <Text style={styles.cardCopy}>No family members are available yet.</Text>
        ) : (
          <View style={styles.list}>
            {family.members.map((member) => (
              <View key={member.id} style={styles.memberRow} accessibilityLabel={`${member.name}, ${member.role}`}>
                <View style={styles.avatar} accessibilityLabel={`${member.name} avatar`}><Text style={styles.avatarText}>{member.initials}</Text></View>
                <View style={styles.memberCopy}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.role}>{member.role}</Text></View>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  state: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  stateTitle: { color: palette.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  eyebrow: { marginTop: 18, color: palette.muted, textTransform: 'uppercase', letterSpacing: 1.8, fontSize: 11, fontWeight: '800' },
  title: { flexShrink: 1, maxWidth: '100%', color: palette.text, fontSize: 32, lineHeight: 38, fontWeight: '800', marginTop: 4 },
  subtitle: { alignSelf: 'stretch', flexShrink: 1, maxWidth: '100%', color: palette.muted, fontSize: 16, lineHeight: 24 },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '800' },
  summary: { color: palette.plum, fontSize: 17, fontWeight: '800', marginTop: spacing.sm },
  cardCopy: { color: palette.muted, fontSize: 15, lineHeight: 22, marginTop: 4, textAlign: 'center' },
  list: { marginTop: spacing.md, gap: spacing.sm },
  memberRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(113,54,93,0.12)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.plum, fontSize: 16, fontWeight: '800' },
  memberCopy: { flex: 1 },
  memberName: { color: palette.text, fontSize: 17, fontWeight: '800' },
  role: { color: palette.muted, fontSize: 14, marginTop: 2 },
});
