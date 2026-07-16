import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { reportRenderErrorTelemetry } from '../services/supabaseAdapter';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    reportRenderErrorTelemetry();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View accessibilityRole="alert" style={styles.root}>
        <Text style={styles.title}>LoopedIn needs a fresh start</Text>
        <Text style={styles.body}>Reload the app to get back to your family plans.</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 16, marginTop: 8, textAlign: 'center' },
});
