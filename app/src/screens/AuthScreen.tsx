import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppBackground } from '../components/AppBackground';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { palette, radii, shadow, spacing } from '../theme/tokens';

export function AuthScreen() {
  const { configured, error, login, pending, localProfiles, chooseLocalProfile } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const invalid = !email.trim() || !password;

  if (!configured) {
    return (
      <AppBackground>
        <View style={styles.centered}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>JONES FAMILY · LOCAL DEMO</Text>
            <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Who’s using LoopedIn?</Text>
            <Text style={styles.body}>Choose your family profile. This only changes who you are in this browser tab.</Text>
            <View style={styles.profileList}>
              {localProfiles.map((profile) => (
                <Pressable key={profile.id} accessibilityRole="button" disabled={pending} onPress={() => chooseLocalProfile(profile.id)} style={styles.profileButton}>
                  <Text style={styles.profileInitials}>{profile.initials}</Text>
                  <View style={styles.profileCopy}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    <Text style={styles.profileRole}>{profile.role === 'owner' ? 'Family owner' : 'Family member'}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          </View>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <View style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>LOOPEDIN</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.body}>Sign in to see your family's shared plans.</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            editable={!pending}
            inputMode="email"
            onChangeText={setEmail}
            placeholder="Email"
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!pending}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={pending || invalid}
            onPress={() => login(email.trim(), password)}
            style={[styles.button, (pending || invalid) && styles.buttonDisabled]}
          >
            {pending ? <ActivityIndicator color={palette.white} /> : <Text style={styles.buttonText}>Sign in</Text>}
          </Pressable>
        </View>
      </View>
    </AppBackground>
  );
}

export function SessionStatusScreen({ title, detail, loading = false }: { title: string; detail: string; loading?: boolean }) {
  return (
    <AppBackground>
      <View style={styles.centered}>
        <View style={styles.statusCard}>
          {loading ? <ActivityIndicator color={palette.coral} size="large" /> : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{detail}</Text>
        </View>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radii.hero, gap: spacing.md, padding: spacing.xl, ...shadow.soft },
  statusCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: radii.hero, gap: spacing.md, padding: spacing.xl, ...shadow.soft },
  eyebrow: { color: palette.coral, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: palette.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  body: { color: palette.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  input: { backgroundColor: palette.white, borderColor: palette.inkSoft, borderRadius: radii.card, borderWidth: 1, color: palette.text, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md },
  error: { color: palette.coral, fontSize: 14, lineHeight: 20 },
  button: { alignItems: 'center', backgroundColor: palette.coral, borderRadius: radii.card, justifyContent: 'center', minHeight: 52 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: palette.white, fontSize: 16, fontWeight: '900' },
  profileList: { gap: spacing.sm },
  profileButton: { alignItems: 'center', backgroundColor: palette.white, borderColor: palette.inkSoft, borderRadius: radii.card, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  profileInitials: { color: palette.coral, fontSize: 16, fontWeight: '900', width: 32 },
  profileCopy: { flex: 1 },
  profileName: { color: palette.text, fontSize: 16, fontWeight: '900' },
  profileRole: { color: palette.muted, fontSize: 13, marginTop: 2 },
});
