import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useInvitationQuery } from '../app/queries';
import { AppBackground } from '../components/AppBackground';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { palette, radii, shadow, spacing } from '../theme/tokens';

type Mode = 'signIn' | 'signUp';

export function AuthScreen() {
  const auth = useAuthSession();
  const invitation = useInvitationQuery(auth.configured ? auth.invitationToken : null);
  const [mode, setMode] = useState<Mode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const nameInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmInput = useRef<TextInput>(null);
  const invitationData = invitation.data;
  const inviteReady = invitationData?.status === 'ready';

  if (!auth.configured) {
    return (
      <AppBackground><View style={styles.centered}><View style={styles.card}>
        <Text style={styles.eyebrow}>JONES FAMILY · LOCAL DEMO</Text>
        <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Who’s using LoopedIn?</Text>
        <Text style={styles.body}>Choose your family profile. This only changes who you are in this browser tab.</Text>
        <View style={styles.profileList}>{auth.localProfiles.map((profile) => (
          <Pressable key={profile.id} accessibilityRole="button" disabled={auth.pending} onPress={() => auth.chooseLocalProfile(profile.id)} style={styles.profileButton}>
            <Text style={styles.profileInitials}>{profile.initials}</Text><View style={styles.profileCopy}><Text style={styles.profileName}>{profile.name}</Text><Text style={styles.profileRole}>{profile.role === 'owner' ? 'Family owner' : 'Family member'}</Text></View>
          </Pressable>
        ))}</View>
        {auth.error ? <Text accessibilityRole="alert" style={styles.error}>{auth.error}</Text> : null}
      </View></View></AppBackground>
    );
  }

  const submit = async () => {
    setFormError(null);
    if (mode === 'signIn') {
      if (!email.trim() || !password) { setFormError('Enter your email and password.'); (!email.trim() ? emailInput : passwordInput).current?.focus(); return; }
      await auth.login(email.trim(), password);
      return;
    }
    if (!displayName.trim() || !email.trim() || !password || password !== confirmPassword) {
      setFormError(password !== confirmPassword ? 'Passwords do not match.' : 'Complete every field.');
      if (!displayName.trim()) nameInput.current?.focus();
      else if (!email.trim()) emailInput.current?.focus();
      else if (!password) passwordInput.current?.focus();
      else confirmInput.current?.focus();
      return;
    }
    await auth.signUpWithInvitation(displayName.trim(), email.trim(), password);
  };

  return (
    <AppBackground><ScrollView contentContainerStyle={styles.centered} keyboardShouldPersistTaps="handled"><View style={styles.card}>
      <Text style={styles.eyebrow}>LOOPEDIN</Text>
      <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>{mode === 'signUp' ? 'Create your account' : 'Welcome back'}</Text>
      {auth.invitationToken ? (
        <View accessibilityLiveRegion="polite" style={styles.inviteCard}>
          {invitation.isPending ? <><ActivityIndicator color={palette.coral} /><Text style={styles.body}>Checking this family invitation…</Text></> : null}
          {invitation.isError || invitation.data?.status === 'unavailable' ? <Text accessibilityRole="alert" style={styles.error}>This invitation isn’t available. Ask the person who invited you for a new link.</Text> : null}
          {invitationData?.status === 'ready' ? <><Text style={styles.inviteTitle}>Join {invitationData.groupName}</Text><Text style={styles.body}>{invitationData.inviterName} invited {invitationData.maskedEmail}. Sign in, or create the invited account.</Text></> : null}
        </View>
      ) : <Text style={styles.body}>Sign in to see your family's shared plans.</Text>}

      {mode === 'signUp' ? <LabeledInput label="Display name" inputRef={nameInput} editable={!auth.pending} value={displayName} onChangeText={setDisplayName} autoComplete="name" invalid={Boolean(formError || auth.error)} /> : null}
      <LabeledInput label="Email" inputRef={emailInput} editable={!auth.pending} value={email} onChangeText={setEmail} autoComplete="email" inputMode="email" autoCapitalize="none" invalid={Boolean(formError || auth.error)} />
      <LabeledInput label="Password" inputRef={passwordInput} editable={!auth.pending} value={password} onChangeText={setPassword} autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} autoCapitalize="none" secureTextEntry invalid={Boolean(formError || auth.error)} />
      {mode === 'signUp' ? <LabeledInput label="Confirm password" inputRef={confirmInput} editable={!auth.pending} value={confirmPassword} onChangeText={setConfirmPassword} autoComplete="new-password" autoCapitalize="none" secureTextEntry invalid={Boolean(formError || auth.error)} /> : null}
      {formError || auth.error ? <Text nativeID="auth-error" accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{formError ?? auth.error}</Text> : null}
      {auth.confirmationRequired ? <Text accessibilityLiveRegion="polite" style={styles.success}>Check your email to confirm your account, then return to this invitation and sign in.</Text> : null}
      <Pressable accessibilityRole="button" disabled={auth.pending || (mode === 'signUp' && !inviteReady)} onPress={submit} style={[styles.button, (auth.pending || (mode === 'signUp' && !inviteReady)) && styles.buttonDisabled]}>
        {auth.pending ? <ActivityIndicator color={palette.white} /> : <Text style={styles.buttonText}>{mode === 'signUp' ? 'Create account' : 'Sign in'}</Text>}
      </Pressable>
      {inviteReady ? <Pressable accessibilityRole="button" onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setFormError(null); }} style={styles.textButton}><Text style={styles.textButtonLabel}>{mode === 'signIn' ? 'Create the invited account' : 'Already have an account? Sign in'}</Text></Pressable> : null}
    </View></ScrollView></AppBackground>
  );
}

function LabeledInput({ label, inputRef, invalid, ...props }: { label: string; inputRef?: React.RefObject<TextInput | null>; invalid: boolean } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput ref={inputRef} accessibilityLabel={label} aria-invalid={invalid} aria-describedby={invalid ? 'auth-error' : undefined} editable={!props.readOnly} placeholder={label} style={[styles.input, invalid && styles.inputInvalid]} {...props} /></View>;
}

export function SessionStatusScreen({ title, detail, loading = false }: { title: string; detail: string; loading?: boolean }) {
  return <AppBackground><View style={styles.centered}><View accessibilityLiveRegion="polite" style={styles.statusCard}>{loading ? <ActivityIndicator color={palette.coral} size="large" /> : null}<Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>{title}</Text><Text style={styles.body}>{detail}</Text></View></View></AppBackground>;
}

const styles = StyleSheet.create({
  centered: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  card: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radii.hero, gap: spacing.md, maxWidth: 520, padding: spacing.xl, width: '100%', ...shadow.soft },
  statusCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: radii.hero, gap: spacing.md, padding: spacing.xl, ...shadow.soft },
  eyebrow: { color: palette.coral, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: palette.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  body: { color: palette.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  inviteCard: { backgroundColor: 'rgba(247,211,200,0.35)', borderRadius: radii.card, gap: spacing.sm, padding: spacing.md },
  inviteTitle: { color: palette.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  field: { gap: 6 }, label: { color: palette.text, fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: palette.white, borderColor: palette.plum, borderRadius: radii.card, borderWidth: 1, color: palette.text, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md },
  inputInvalid: { borderColor: palette.coral }, error: { color: palette.coral, fontSize: 14, lineHeight: 20 }, success: { color: palette.plum, fontSize: 14, lineHeight: 20 },
  button: { alignItems: 'center', backgroundColor: palette.plum, borderColor: palette.plum, borderRadius: radii.card, borderWidth: 1, justifyContent: 'center', minHeight: 52 }, buttonDisabled: { opacity: 0.5 }, buttonText: { color: palette.white, fontSize: 16, fontWeight: '900' },
  textButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm }, textButtonLabel: { color: palette.plum, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  profileList: { gap: spacing.sm }, profileButton: { alignItems: 'center', backgroundColor: palette.white, borderColor: palette.plum, borderRadius: radii.card, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  profileInitials: { color: palette.coral, fontSize: 16, fontWeight: '900', width: 32 }, profileCopy: { flex: 1 }, profileName: { color: palette.text, fontSize: 16, fontWeight: '900' }, profileRole: { color: palette.muted, fontSize: 13, marginTop: 2 },
});
