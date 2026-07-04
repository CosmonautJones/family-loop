import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HomeScreen } from '../screens/HomeScreen';
import { palette, radii, spacing } from '../theme/tokens';
import { useAppShellState } from './useAppShellState';

export function AppShell() {
  const { activeSection, sections, setActiveSection } = useAppShellState();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <HomeScreen activeSection={activeSection} />
      </ScrollView>
      <View accessibilityLabel="Bottom navigation" style={styles.nav}>
        {sections.map((section) => (
          <Pressable
            key={section.key}
            onPress={() => setActiveSection(section.key)}
            style={[styles.navItem, section.isActive && styles.navItemActive]}
          >
            <Text style={[styles.navLabel, section.isActive && styles.navLabelActive]}>{section.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  container: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxxl + 32,
  },
  nav: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.lg,
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  navItem: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  navItemActive: {
    backgroundColor: palette.plum,
  },
  navLabel: {
    color: palette.muted,
    fontWeight: '700',
  },
  navLabelActive: {
    color: palette.white,
  },
});
