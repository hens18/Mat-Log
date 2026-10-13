import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';

import { colors, spacing } from '@/constants/theme';
import { formatMonth, formatShortDate } from '@/utils/format';

import { axisScale } from '../chartScale';
import type { TrendPoint, TrendRange } from '../trend';

const CHART_HEIGHT = 180;
const Y_AXIS_WIDTH = 44;
const EDGE_SPACING = 16;
const LABEL_WIDTH = 52;
const MAX_LABELS = 5;

type TrendChartProps = {
  points: TrendPoint[];
  range: TrendRange;
};

function pointLabel(point: TrendPoint, range: TrendRange): string {
  return range === 'month' ? formatMonth(point.date) : formatShortDate(point.date);
}

/** Show at most MAX_LABELS evenly spaced x-axis labels, always including the ends. */
function labelIndexes(count: number): Set<number> {
  if (count <= MAX_LABELS) return new Set(Array.from({ length: count }, (_, i) => i));
  const step = (count - 1) / (MAX_LABELS - 1);
  return new Set(Array.from({ length: MAX_LABELS }, (_, i) => Math.round(i * step)));
}

/** Several Day-view readings share a date; label each date only once. */
function dedupeLabels(labels: { index: number; text: string }[]) {
  return labels.filter((label, i) => i === 0 || label.text !== labels[i - 1].text);
}

export function TrendChart({ points, range }: TrendChartProps) {
  const [width, setWidth] = useState(0);

  const { data, scale, labels } = useMemo(() => {
    const show = labelIndexes(points.length);
    // Labels are drawn by us below the chart: gifted-charts clips each label
    // to the space between points, which is too narrow in the Day view.
    const items: lineDataItem[] = points.map((point) => ({ value: point.value }));
    return {
      data: items,
      scale: axisScale(points.map((p) => p.value)),
      labels: dedupeLabels(
        [...show].sort((a, b) => a - b).map((i) => ({ index: i, text: pointLabel(points[i], range) })),
      ),
    };
  }, [points, range]);

  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH);
  const spacingBetween =
    points.length > 1 ? (plotWidth - EDGE_SPACING * 2) / (points.length - 1) : 0;
  const firstX = points.length > 1 ? EDGE_SPACING : plotWidth / 2;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.container}>
      {points.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No weigh-ins in this range yet.</Text>
        </View>
      ) : width > 0 ? (
        <LineChart
          data={data}
          width={plotWidth}
          height={CHART_HEIGHT}
          spacing={spacingBetween}
          initialSpacing={firstX}
          endSpacing={EDGE_SPACING}
          disableScroll
          yAxisOffset={scale.min}
          stepValue={scale.step}
          maxValue={scale.step * scale.sections}
          noOfSections={scale.sections}
          formatYLabel={(label) => {
            const value = Number(label);
            return Number.isInteger(value) ? String(value) : value.toFixed(1);
          }}
          yAxisLabelWidth={Y_AXIS_WIDTH}
          yAxisTextStyle={styles.yLabel}
          yAxisColor="transparent"
          xAxisColor={colors.border}
          rulesColor={colors.border}
          rulesType="dashed"
          color={colors.primary}
          thickness={2.5}
          dataPointsColor={colors.primary}
          dataPointsRadius={points.length > 40 ? 0 : 3.5}
          areaChart
          startFillColor={colors.primary}
          endFillColor={colors.primary}
          startOpacity={0.25}
          endOpacity={0.02}
          xAxisLabelsHeight={0}
        />
      ) : null}
      {points.length > 0 && width > 0 ? (
        <View style={styles.labels}>
          {labels.map(({ index, text }) => (
            <Text
              key={index}
              numberOfLines={1}
              style={[
                styles.xLabel,
                { left: Y_AXIS_WIDTH + firstX + index * spacingBetween - LABEL_WIDTH / 2 },
              ]}>
              {text}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: CHART_HEIGHT + 40,
    justifyContent: 'center',
  },
  empty: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  labels: {
    height: 20,
    marginTop: spacing.xs,
  },
  xLabel: {
    position: 'absolute',
    width: LABEL_WIDTH,
    fontSize: 11,
    textAlign: 'center',
    color: colors.textMuted,
  },
  yLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
