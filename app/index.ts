import { registerRootComponent } from 'expo';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createElement, type ComponentType, useEffect, useState } from 'react';
import { initializeRuntimeConfig } from './src/config/runtimeConfig';
import App from './App';

function Root() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    initializeRuntimeConfig()
      .then(() => { if (active) setReady(true); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (failed) {
    return createElement(View, { accessibilityRole: 'alert', style: styles.state },
      createElement(Text, { accessibilityRole: 'header', style: styles.title }, 'LoopedIn is unavailable'),
      createElement(Text, { style: styles.detail }, 'This environment is not configured safely. Ask the release owner to check it, then reload.'));
  }
  if (!ready) {
    return createElement(View, { accessibilityLabel: 'Loading LoopedIn', style: styles.state },
      createElement(ActivityIndicator, { accessibilityRole: 'progressbar', size: 'large' }),
      createElement(Text, { style: styles.detail }, 'Opening your family plans…'));
  }
  return createElement(App as ComponentType);
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  title: { color: '#3d213c', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  detail: { color: '#554451', fontSize: 16, lineHeight: 24, maxWidth: 420, textAlign: 'center' },
});

registerRootComponent(Root);
