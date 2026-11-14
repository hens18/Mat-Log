import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { WeightUnit } from '@/types/models';
import { formatMonth, formatShortDate, formatWeight } from '@/utils/format';

import { axisScale } from '../chartScale';
import type { TrendPoint, TrendRange } from '../trend';

const CHART_HEIGHT = 190;
const Y_AXIS_WIDTH = 44;
const EDGE_SPACING = 16;
const LABEL_WIDTH = 52;
const MAX_LABELS = 5;
const TOOLTIP_WIDTH = 120;
// Only draw the goal line when it's close enough not to squash the data.
const GOAL_LINE_MAX_DISTANCE = 6;

type TrendChartProps = {
  points: TrendPoint[];
  range: TrendRange;
  unit: WeightUnit;
  goalWeight?: number | null;
};

function pointLabel(point: TrendPoint, range: TrendRange): string {
  return range === 'month' ? formatMonth(point.date) : formatShortDate(point.date);
}

function tooltipLabel(point: TrendPoint, range: TrendRange): string {
  if (range === 'day') {
    return point.date.toLocaleString(undefined, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (range === 'week') return `Week of ${formatShortDate(point.date)}`;
  return point.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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

export function TrendChart({ points, range, unit, goalWeight }: TrendChartProps) {
  const [width, setWidth] = useState(0);

  const { data, scale, labels, showGoal } = useMemo(() => {
    const values = points.map((p) => p.value);
    const nearGoal =
      goalWeight != null &&
      values.length > 0 &&
      goalWeight >= Math.min(...values) - GOAL_LINE_MAX_DISTANCE &&
      goalWeight <= Math.max(...values) + GOAL_LINE_MAX_DISTANCE;
    const show = labelIndexes(points.length);
    // Labels are drawn by us below the chart: gifted-charts clips each label
    // to the space between points, which is too narrow in the Day view.
    const items: lineDataItem[] = points.map((point) => ({ value: point.value }));
    return {
      data: items,
      scale: axisScale(nearGoal ? [...values, goalWeight] : values),
      showGoal: nearGoal,
      labels: dedupeLabels(
        [...show]
          .sort((a, b) => a - b)
          .map((i) => ({ index: i, text: pointLabel(points[i], range) })),
      ),
    };
  }, [points, range, goalWeight]);

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
          thickness={3}
          curved
          curvature={0.15}
          dataPointsColor={colors.primary}
          dataPointsRadius={points.length > 40 ? 0 : 3.5}
          areaChart
          startFillColor={colors.primary}
          endFillColor={colors.primary}
          startOpacity={0.3}
          endOpacity={0.01}
          xAxisLabelsHeight={0}
          showReferenceLine1={showGoal}
          referenceLine1Position={goalWeight ?? 0}
          referenceLine1Config={{
            color: colors.success,
            thickness: 1.5,
            dashWidth: 6,
            dashGap: 4,
            labelText: 'Goal',
            labelTextStyle: { ...goalLabelStyle },
          }}
          pointerConfig={{
            pointerStripColor: colors.textMuted,
            pointerStripWidth: 1,
            pointerColor: colors.primary,
            radius: 6,
            pointerLabelWidth: TOOLTIP_WIDTH,
            pointerLabelHeight: 52,
            autoAdjustPointerLabelPosition: true,
            shiftPointerLabelX: -TOOLTIP_WIDTH / 2 + 6,
            shiftPointerLabelY: -8,
            pointerLabelComponent: (_items: lineDataItem[], _secondary: unknown, index: number) => {
              const point = points[index];
              if (!point) return null;
              return (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipValue}>{formatWeight(point.value, unit)}</Text>
                  <Text style={styles.tooltipLabel} numberOfLines={1}>
                    {tooltipLabel(point, range)}
                  </Text>
                </View>
              );
            },
          }}
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

// gifted-charts adds properties to nested config objects, which fails on
// frozen StyleSheet styles in development, so this one stays a plain object.
const goalLabelStyle = {
  color: colors.success,
  fontFamily: fonts.semibold,
  fontSize: 11,
};

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
    fontFamily: fonts.regular,
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
    fontFamily: fonts.regular,
    textAlign: 'center',
    color: colors.textMuted,
  },
  yLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  tooltip: {
    width: TOOLTIP_WIDTH,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tooltipValue: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.text,
  },
  tooltipLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
