import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, shadow } from '../theme/tokens';

export function PhotoCard({ uri, title, subtitle, height = 220 }: { uri: string; title: string; subtitle?: string; height?: number }) {
  return (
    <View style={[styles.card, { height }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      <LinearGradient colors={['transparent', 'rgba(36,21,26,0.82)']} style={styles.overlay} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radii.hero,
    backgroundColor: palette.peach,
    ...shadow.glow,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  copy: {
    marginTop: 'auto',
    padding: 18,
  },
  title: {
    color: palette.white,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    fontWeight: '700',
  },
});
