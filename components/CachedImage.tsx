import { Image, View, StyleSheet, ActivityIndicator, ImageStyle } from 'react-native';
import { useState } from 'react';
import { COLORS } from '@/lib/theme';

type Props = {
  uri: string | null | undefined;
  style?: ImageStyle;
};

export function CachedImage({ uri, style }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  return (
    <View style={[styles.wrap, style]}>
      {!loaded && !errored && (
        <View style={styles.placeholder}>
          <ActivityIndicator color={COLORS.gold} size="small" />
        </View>
      )}
      {errored ? (
        <View style={[styles.placeholder, { backgroundColor: COLORS.surfaceTertiary }]} />
      ) : (
        <Image source={{ uri: uri ?? '' }} style={[styles.image, style, loaded && styles.loaded]} onLoadEnd={() => setLoaded(true)} onError={() => setErrored(true)} fadeDuration={250} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: COLORS.surfaceTertiary },
  image: { opacity: 0 },
  loaded: { opacity: 1 },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceTertiary },
});
