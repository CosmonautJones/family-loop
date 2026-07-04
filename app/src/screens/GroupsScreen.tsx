import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { groupsOverview } from '../data/sampleData';
import { palette, spacing } from '../theme/tokens';

export function GroupsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Groups & onboarding</Text>
      <Text style={styles.title}>Choose your people, then start with the next event.</Text>
      <Text style={styles.subtitle}>{groupsOverview.description}</Text>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Your groups</Text>
        <View style={styles.list}>
          {groupsOverview.groups.map((group) => (
            <View key={group.name} style={styles.groupRow}>
              <View>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.cardCopy}>{group.detail}</Text>
              </View>
              <Chip label={group.badge} tone={group.tone} />
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Quick start</Text>
        <View style={styles.steps}>
          {groupsOverview.steps.map((step, index) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.step}><Text style={styles.stepText}>{index + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{step.title}</Text>
                <Text style={styles.cardCopy}>{step.detail}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.actionRow}>
          <Button label="Create group" />
          <Button label="Try friend-group flow" tone="secondary" />
        </View>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 40,
  },
  eyebrow: {
    marginTop: 18,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: palette.text,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 10,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 8,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  cardCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  groupName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  steps: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(113,54,93,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    color: palette.plum,
    fontWeight: '800',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
});
