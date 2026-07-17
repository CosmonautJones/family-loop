import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppBackground } from '../components/AppBackground';
import { Avatar } from '../components/Avatar';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MemoriesScreen } from '../screens/MemoriesScreen';
import { fonts, gradients, palette, radii, shadow, spacing } from '../theme/tokens';
import { useAppShellState } from './useAppShellState';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { AuthScreen, SessionStatusScreen } from '../screens/AuthScreen';
import { FamilyOnboardingScreen } from '../screens/FamilyOnboardingScreen';
import { useActiveGroupQuery } from '../app/queries';
import { AccountDeletionRecoveryScreen } from '../screens/AccountDeletionRecoveryScreen';

function initialsOf(name?: string) {
  if (!name) return 'LI';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'LI';
}

export function AppShell() {
  const auth = useAuthSession();
  const { tabItems, activeTab, activeSurface, activeEventId, setActiveTab, openEventDetail, closeEventDetail } = useAppShellState();

  if (auth.recoveryStatus !== 'idle') return <AuthScreen />;
  if (auth.status === 'restoring') {
    return <SessionStatusScreen loading title="Restoring your plans" detail="Connecting to your private family space…" />;
  }
  if (auth.status === 'signedOut' || auth.status === 'error') return <AuthScreen />;
  if (auth.deletionStatusPending) {
    return <SessionStatusScreen loading title="Checking account access" detail="Confirming your private family access…" />;
  }
  if (auth.deletionStatusError) {
    return <SessionStatusScreen title="We couldn't check account access" detail={auth.deletionStatusError} />;
  }
  if (auth.deletionStatus) return <AppBackground><AccountDeletionRecoveryScreen /></AppBackground>;
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
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.wordmark}>Looped<Text style={styles.wordmarkAccent}>In</Text></Text>
            <ActiveFamilyLabel />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Family and account. Signed in as ${auth.session?.displayName ?? 'your account'}.`}
            onPress={() => setActiveTab('Family')}
            hitSlop={8}
          >
            <Avatar initials={initialsOf(auth.session?.displayName)} />
          </Pressable>
        </View>

        <View style={styles.navWrap} pointerEvents="box-none">
          <BlurView intensity={30} tint="light" style={styles.navBar}>
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
                  {tab.active ? <View style={styles.activePill} /> : null}
                  <Text style={[styles.navText, tab.active && styles.navTextActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
          </BlurView>
        </View>

        {activeSurface !== 'EventDetail' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new plan"
            onPress={() => setActiveTab('Create')}
            style={styles.fabWrap}
          >
            <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
              <Text style={styles.fabPlus}>+</Text>
            </LinearGradient>
          </Pressable>
        ) : null}

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
  return (
    <Text style={styles.familyLabel} accessibilityLabel={`Signed in as ${auth.session?.displayName}. Active family: ${activeGroup.data.name}`}>
      {activeGroup.data.name}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    minHeight: 56,
  },
  brandBlock: { minWidth: 0, flexShrink: 1 },
  wordmark: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 19, letterSpacing: -0.4 },
  wordmarkAccent: { color: palette.plum },
  familyLabel: { color: palette.muted, fontFamily: fonts.regular, fontSize: 12.5, marginTop: 1 },
  content: { flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, backgroundColor: 'transparent' },

  fabWrap: { position: 'absolute', right: spacing.lg, bottom: 96, zIndex: 20 },
  fab: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  fabPlus: { color: palette.white, fontSize: 30, lineHeight: 32, fontWeight: '700', marginTop: -2 },

  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.md, zIndex: 10 },
  navBar: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: radii.hero,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.glass,
    ...shadow.soft,
  },
  navRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 6 },
  navItem: { flex: 1, minHeight: 58, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' },
  activePill: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(113,54,93,0.07)', borderRadius: radii.md },
  navText: { color: palette.faint, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 12, letterSpacing: -0.1 },
  navTextActive: { color: palette.plum, fontFamily: fonts.bold, fontWeight: '700' },
});
