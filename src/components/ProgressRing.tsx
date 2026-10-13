import { useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

type ProgressRingProps = {
  size: number;
  strokeWidth: number;
  /** 0 to 1. */
  progress: number;
  color?: string;
  /** Second color for a gradient along the arc. */
  colorEnd?: string;
  trackColor?: string;
  /** Soft halo behind the ring, like the glow in the reference designs. */
  glow?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
};

export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color = colors.primary,
  colorEnd,
  trackColor = colors.surfaceRaised,
  glow = false,
  children,
  style,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const id = `ring-${useId().replace(/:/g, '')}`;
  const stroke = colorEnd ? `url(#${id})` : color;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {glow ? (
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              width: size * 0.9,
              height: size * 0.9,
              borderRadius: size,
              left: size * 0.05,
              top: size * 0.05,
              shadowColor: color,
              backgroundColor: `${color}14`,
            },
          ]}
        />
      ) : null}
      <Svg width={size} height={size}>
        {colorEnd ? (
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={color} />
              <Stop offset="1" stopColor={colorEnd} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped)}
            // Start at 12 o'clock instead of 3 o'clock.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.center}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
