import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
import { FamilyOnboardingScreen } from '../screens/FamilyOnboardingScreen';
import { useActiveGroupQuery } from '../app/queries';

export function AppShell() {
  const { width } = useWindowDimensions();
  const auth = useAuthSession();
  const { tabItems, activeTab, activeSurface, activeEventId, setActiveTab, openEventDetail, closeEventDetail } = useAppShellState();

  if (auth.recoveryStatus !== 'idle') return <AuthScreen />;
  if (auth.status === 'restoring') {
    return <SessionStatusScreen loading title="Restoring your plans" detail="Connecting to your private family space…" />;
  }
  if (auth.status === 'signedOut' || auth.status === 'error') return <AuthScreen />;
  if (auth.invitationToken) return <AppBackground><FamilyOnboardingScreen /></AppBackground>;
  if (auth.groupsPending) {
    return <SessionStatusScreen loading title="Loading your groups" detail="Finding the plans shared with you…" />;
  }
  if (auth.groupError) {
    return <SessionStatusScreen title="We couldn't load your groups" detail={auth.groupError} />;
  }
  if (auth.groups?.length === 0) {
    return <AppBackground><FamilyOnboardingScreen /></AppBackground>;
  }

  return (
    <AppBackground>
      <View style={styles.root}>
        <ActiveFamilyLabel />
        <View style={[styles.navOuter, { width: Math.max(width - (2 * spacing.md), 0) }]}>
          {auth.session ? (
            <Pressable accessibilityRole="button" disabled={auth.pending} onPress={auth.logout} style={styles.signOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          ) : null}
          <BlurView intensity={42} tint="light" style={styles.navWrap}>
            <View accessibilityRole="tablist" style={styles.navRow}>
              {tabItems.map((tab) => (
                <Pressable
                  key={tab.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab.active }}
                  aria-selected={tab.active}
                  onPress={() => setActiveTab(tab.label)}
                  style={styles.navItem}
                  tabIndex={0}
                >
                  {tab.active ? <LinearGradient colors={gradients.sunset} style={styles.activePill} /> : null}
                  <Text style={[styles.navText, tab.active && styles.navTextActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
          </BlurView>
        </View>
        <View role="main" style={styles.content}>
          {activeSurface === 'EventDetail' ? <EventDetailScreen eventId={activeEventId} backLabel={`Back to ${activeTab.toLowerCase()}`} onBack={closeEventDetail} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Home' ? <HomeScreen onOpenEvent={(eventId) => openEventDetail('Home', eventId)} onCreateEvent={() => setActiveTab('Create')} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Calendar' ? <CalendarScreen onOpenEvent={(eventId) => openEventDetail('Calendar', eventId)} onCreateEvent={() => setActiveTab('Create')} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Create' ? <CreateEventScreen onCreated={(eventId) => openEventDetail('Create', eventId)} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Memories' ? <MemoriesScreen onOpenEvent={(eventId) => openEventDetail('Memories', eventId)} /> : null}
          {activeSurface !== 'EventDetail' && activeTab === 'Family' ? <GroupsScreen /> : null}
        </View>
      </View>
    </AppBackground>
  );
}

function ActiveFamilyLabel() {
  const activeGroup = useActiveGroupQuery();
  const auth = useAuthSession();
  if (!activeGroup.data) return null;
  return <Text style={styles.familyLabel} accessibilityLabel={`Current person: ${auth.session?.displayName}. Active family: ${activeGroup.data.name}`}>{auth.session?.displayName} · {activeGroup.data.name}</Text>;
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
    paddingBottom: 180,
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
    padding: 5,
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
    gap: 2,
    overflow: 'hidden',
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.card,
  },
  navText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.35,
    flexShrink: 1,
  },
  navTextActive: {
    color: palette.white,
  },
});
