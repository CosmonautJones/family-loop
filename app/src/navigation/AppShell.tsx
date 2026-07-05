import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppBackground } from '../components/AppBackground';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MemoriesScreen } from '../screens/MemoriesScreen';
import { gradients, palette, radii, shadow, spacing } from '../theme/tokens';
import { useAppShellState } from './useAppShellState';

const tabIcons = {
  Home: 'home',
  Calendar: 'calendar',
  Create: 'add-circle',
  Memories: 'images',
  Groups: 'people',
} as const;

export function AppShell() {
  const { tabItems, activeTab, activeSurface, setActiveTab, openEventDetail, closeEventDetail } = useAppShellState();

  return (
    <AppBackground>
      <View style={styles.root}>
        <View style={styles.content}>
          {activeSurface === 'EventDetail' ? <EventDetailScreen backLabel={`Back to ${activeTab.toLowerCase()}`} onBack={closeEventDetail} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Home' ? <HomeScreen onOpenEvent={() => openEventDetail('Home')} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Calendar' ? <CalendarScreen onOpenEvent={() => openEventDetail('Calendar')} /> : null}
          {activeTab === 'Create' ? <CreateEventScreen /> : null}
          {activeTab === 'Memories' ? <MemoriesScreen /> : null}
          {activeTab === 'Groups' ? <GroupsScreen /> : null}
        </View>
        <View style={styles.navOuter}>
          <BlurView intensity={42} tint="light" style={styles.navWrap}>
            <View style={styles.navRow}>
              {tabItems.map((tab) => (
                <Pressable
                  key={tab.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${tab.label} tab`}
                  onPress={() => setActiveTab(tab.label)}
                  style={styles.navItem}
                >
                  {tab.active ? <LinearGradient colors={gradients.sunset} style={styles.activePill} /> : null}
                  <Ionicons
                    name={tabIcons[tab.label]}
                    size={tab.label === 'Create' ? 27 : 22}
                    color={tab.active ? palette.white : palette.muted}
                  />
                  <Text style={[styles.navText, tab.active && styles.navTextActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
          </BlurView>
        </View>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  navOuter: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  navWrap: {
    overflow: 'hidden',
    borderRadius: radii.hero,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.66)',
    backgroundColor: 'rgba(255,249,244,0.74)',
    ...shadow.soft,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  navItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.card,
  },
  navText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  navTextActive: {
    color: palette.white,
  },
});
