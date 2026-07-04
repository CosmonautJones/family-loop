import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MemoriesScreen } from '../screens/MemoriesScreen';
import { palette, radii, spacing } from '../theme/tokens';
import { useAppShellState } from './useAppShellState';

export function AppShell() {
  const { tabItems, activeTab, setActiveTab } = useAppShellState();

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'Home' ? <HomeScreen /> : null}
        {activeTab === 'Calendar' ? <CalendarScreen /> : null}
        {activeTab === 'Create' ? <CreateEventScreen /> : null}
        {activeTab === 'Memories' ? <MemoriesScreen /> : null}
        {activeTab === 'Groups' ? <GroupsScreen /> : null}
      </View>
      <View style={styles.navWrap}>
        <Text style={styles.label}>Bottom navigation</Text>
        <View style={styles.navRow}>
          {tabItems.map((tab) => (
            <Pressable
              key={tab.label}
              accessibilityRole="button"
              onPress={() => setActiveTab(tab.label)}
              style={[styles.navItem, tab.active && styles.navItemActive]}
            >
              <Text style={[styles.navText, tab.active && styles.navTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    flex: 1,
  },
  navWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(32,22,28,0.08)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: palette.muted,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  navItem: {
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(32,22,28,0.06)',
  },
  navItemActive: {
    backgroundColor: palette.plum,
  },
  navText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  navTextActive: {
    color: '#fff',
  },
});
