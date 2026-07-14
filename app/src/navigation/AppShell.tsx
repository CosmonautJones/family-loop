import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { useActiveGroupQuery } from '../app/queries';

const tabIcons = {
  Home: 'home',
  Calendar: 'calendar',
  Create: 'add-circle',
  Memories: 'images',
  Family: 'people',
} as const;

export function AppShell() {
  const { width } = useWindowDimensions();
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
        <ActiveFamilyLabel />
        <View style={styles.content}>
          {activeSurface === 'EventDetail' ? <EventDetailScreen eventId={activeEventId} backLabel={`Back to ${activeTab.toLowerCase()}`} onBack={closeEventDetail} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Home' ? <HomeScreen onOpenEvent={(eventId) => openEventDetail('Home', eventId)} onCreateEvent={() => setActiveTab('Create')} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Calendar' ? <CalendarScreen onOpenEvent={(eventId) => openEventDetail('Calendar', eventId)} onCreateEvent={() => setActiveTab('Create')} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Create' ? <CreateEventScreen onCreated={(eventId) => openEventDetail('Create', eventId)} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Memories' ? <MemoriesScreen /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Family' ? <GroupsScreen /> : null}
        </View>
        <View style={[styles.navOuter, { width: Math.max(width - (2 * spacing.md), 0) }]}>
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
                  accessibilityState={{ selected: tab.active }}
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

function ActiveFamilyLabel() {
  const activeGroup = useActiveGroupQuery();
  if (!activeGroup.data) return null;
  return <Text style={styles.familyLabel} accessibilityLabel={`Active family: ${activeGroup.data.name}`}>{activeGroup.data.name}</Text>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    paddingBottom: 150,
  },
  familyLabel: { minHeight: 48, paddingHorizontal: spacing.lg, paddingTop: spacing.md, color: palette.plum, fontSize: 14, fontWeight: '800', textAlignVertical: 'center' },
  navOuter: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    minWidth: 0,
    boxSizing: 'border-box',
    zIndex: 10,
  },
  signOut: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  signOutText: { color: palette.muted, fontSize: 12, fontWeight: '800' },
  navWrap: {
    alignSelf: 'stretch',
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: radii.hero,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.66)',
    backgroundColor: 'rgba(255,249,244,0.74)',
    ...shadow.soft,
  },
  navRow: {
    alignSelf: 'stretch',
    minWidth: 0,
    boxSizing: 'border-box',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  navItem: {
    flexBasis: '20%',
    maxWidth: '20%',
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
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
    fontSize: 9,
    fontWeight: '800',
    flexShrink: 1,
  },
  navTextActive: {
    color: palette.white,
  },
});
