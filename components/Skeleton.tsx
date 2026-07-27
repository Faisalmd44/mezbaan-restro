import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { COLORS } from '@/lib/theme';

type Props = { width?: number | `${number}%`; height?: number; radius?: number; count?: number };

export function Skeleton({ width = '100%', height = 16, radius = 8 }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.skeleton, { width, height, borderRadius: radius, opacity }]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={140} radius={12} />
      <Skeleton width="80%" height={14} />
      <Skeleton width="50%" height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: COLORS.surfaceTertiary },
  card: { gap: 8, padding: 8, width: 180 },
});
