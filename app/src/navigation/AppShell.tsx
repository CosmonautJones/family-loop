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
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { AuthScreen, SessionStatusScreen } from '../screens/AuthScreen';

const tabIcons = {
  Home: 'home',
  Calendar: 'calendar',
  Create: 'add-circle',
  Memories: 'images',
  Groups: 'people',
} as const;

export function AppShell() {
  const auth = useAuthSession();
  const { tabItems, activeTab, activeSurface, activeEventId, setActiveTab, openEventDetail, closeEventDetail } = useAppShellState();

  if (auth.configured && auth.status === 'restoring') {
    return <SessionStatusScreen loading title="Restoring your plans" detail="Connecting to your private family space…" />;
  }
  if (auth.configured && (auth.status === 'signedOut' || auth.status === 'error')) return <AuthScreen />;
  if (auth.configured && auth.groupsPending) {
    return <SessionStatusScreen loading title="Loading your groups" detail="Finding the plans shared with you…" />;
  }
  if (auth.configured && auth.groupError) {
    return <SessionStatusScreen title="We couldn't load your groups" detail={auth.groupError} />;
  }
  if (auth.configured && auth.groups?.length === 0) {
    return <SessionStatusScreen title="No groups yet" detail="You aren't part of a LoopedIn group yet." />;
  }

  return (
    <AppBackground>
      <View style={styles.root}>
        <View style={styles.content}>
          {activeSurface === 'EventDetail' ? <EventDetailScreen eventId={activeEventId} backLabel={`Back to ${activeTab.toLowerCase()}`} onBack={closeEventDetail} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Home' ? <HomeScreen onOpenEvent={(eventId) => openEventDetail('Home', eventId)} onCreateEvent={() => setActiveTab('Create')} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Calendar' ? <CalendarScreen onOpenEvent={(eventId) => openEventDetail('Calendar', eventId)} onCreateEvent={() => setActiveTab('Create')} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Create' ? <CreateEventScreen onCreated={(eventId) => openEventDetail('Create', eventId)} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Memories' ? <MemoriesScreen /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Groups' ? <GroupsScreen /> : null}
        </View>
        <View style={styles.navOuter}>
          {auth.configured ? (
            <Pressable accessibilityRole="button" disabled={auth.pending} onPress={auth.logout} style={styles.signOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          ) : null}
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
  signOut: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  signOutText: { color: palette.muted, fontSize: 12, fontWeight: '800' },
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
