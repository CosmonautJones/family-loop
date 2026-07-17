import { StyleSheet, Text, View } from 'react-native';
import {
  useFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { AppShell } from './src/navigation/AppShell';
import { AppProviders } from './src/app/AppProviders';
import { getRuntimeConfig, usesWebRuntimeConfig } from './src/config/runtimeConfig';
import { AppErrorBoundary } from './src/app/AppErrorBoundary';
import { palette } from './src/theme/tokens';

export default function App() {
  const config = getRuntimeConfig();
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });
  if (!fontsLoaded) return <View style={styles.boot} />;
  return (
    <View style={styles.root}>
      {usesWebRuntimeConfig ? (
        <View accessibilityLabel={`Environment: ${config.environmentId}. ${config.dataMode === 'supabase' ? 'Connected backend' : 'Local demo'}.`} style={styles.environment}>
          <Text style={styles.environmentText}>{config.environmentId} · {config.dataMode === 'supabase' ? 'Connected' : 'Local demo'}</Text>
        </View>
      ) : null}
      <AppErrorBoundary>
        <AppProviders>
          <AppShell />
        </AppProviders>
      </AppErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  boot: { flex: 1, backgroundColor: palette.bg },
  environment: { alignItems: 'center', backgroundColor: palette.well, minHeight: 26, justifyContent: 'center', paddingHorizontal: 12 },
  environmentText: { color: palette.muted, fontSize: 11, fontFamily: 'InstrumentSans_600SemiBold', fontWeight: '600', letterSpacing: 0.2 },
});
