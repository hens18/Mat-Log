// iOS home screen widget: the countdown to the next competition, today's
// weight against the weight class, and how much to lose per day. Rendered by
// expo-widgets in a separate runtime, so (per its docs) everything must live
// inside the function: no hooks, no imports used at runtime, no module-scope
// constants. The app pushes props from src/widgets/sync.ios.ts.

import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, lineLimit, minimumScaleFactor } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { CountdownWidgetProps } from './timeline';

const CountdownWidget = (props: CountdownWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const text = '#F5F6F8';
  const muted = '#959BA7';
  const accent = '#E4572E';
  const toneColor =
    props.tone === 'good'
      ? '#3FB27F'
      : props.tone === 'bad'
        ? '#FF6B6B'
        : props.tone === 'warn'
          ? '#F5B841'
          : muted;

  const countdown = (
    <VStack alignment="leading" spacing={0}>
      <Text
        modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(accent), lineLimit(1)]}>
        {props.name.toUpperCase()}
      </Text>
      <Text
        modifiers={[
          font({ size: 52, weight: 'heavy', design: 'rounded' }),
          foregroundStyle(text),
          minimumScaleFactor(0.5),
          lineLimit(1),
        ]}>
        {props.days}
      </Text>
      <Text
        modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(muted), lineLimit(1)]}>
        {props.daysLabel}
      </Text>
    </VStack>
  );

  const planLine = (
    <Text
      modifiers={[
        font({ size: 12, weight: 'semibold' }),
        foregroundStyle(toneColor),
        lineLimit(2),
      ]}>
      {props.plan}
    </Text>
  );

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={6}>
        {countdown}
        <Spacer />
        {planLine}
      </VStack>
    );
  }

  const stat = (label: string, value: string, color: string) => (
    <VStack alignment="leading" spacing={1}>
      <Text
        modifiers={[
          font({ size: 17, weight: 'bold', design: 'rounded' }),
          foregroundStyle(color),
          minimumScaleFactor(0.6),
          lineLimit(1),
        ]}>
        {value}
      </Text>
      <Text
        modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(muted), lineLimit(1)]}>
        {label}
      </Text>
    </VStack>
  );

  return (
    <HStack alignment="top" spacing={14}>
      <VStack alignment="leading" spacing={4}>
        {countdown}
        <Spacer />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>
          {props.dateLabel}
        </Text>
      </VStack>
      <VStack alignment="leading" spacing={8}>
        <HStack spacing={12}>
          {stat(props.weightLabel, props.weight, text)}
          {stat('Class', props.weightClass, text)}
        </HStack>
        {stat(props.differenceLabel, props.difference, toneColor)}
        <Spacer />
        {planLine}
      </VStack>
    </HStack>
  );
};

export default createWidget('CountdownWidget', CountdownWidget);
