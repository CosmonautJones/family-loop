import { StyleSheet, Text, View } from 'react-native';
import { AppShell } from './src/navigation/AppShell';
import { AppProviders } from './src/app/AppProviders';
import { getRuntimeConfig, usesWebRuntimeConfig } from './src/config/runtimeConfig';
import { AppErrorBoundary } from './src/app/AppErrorBoundary';

export default function App() {
  const config = getRuntimeConfig();
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
  root: { flex: 1 },
  environment: { alignItems: 'center', backgroundColor: '#3d213c', minHeight: 28, justifyContent: 'center', paddingHorizontal: 12 },
  environmentText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
});
