import { StyleSheet, Text, View } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { useAppShellState } from './useAppShellState';
import { palette } from '../theme/tokens';

export function AppShell() {
  const { tabs, activeTab } = useAppShellState();

  return (
    <View style={styles.root}>
      <HomeScreen />
      <View style={styles.nav}>
        <Text style={styles.label}>Bottom navigation</Text>
        <Text style={styles.tabs}>{tabs.join(' · ')}</Text>
        <Text style={styles.active}>Active: {activeTab}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  nav: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(32,22,28,0.08)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: palette.muted,
    fontWeight: '700',
  },
  tabs: {
    marginTop: 4,
    color: palette.text,
    fontWeight: '700',
  },
  active: {
    marginTop: 4,
    color: palette.plum,
    fontWeight: '800',
  },
});
