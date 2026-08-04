import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer } from "recharts";
import {
  CHART_COLORS,
  ChartFrame,
  ChartLegend,
  ChartTooltip,
  defaultValueFormatter,
  getInitialChartDimensions,
  resolveChartHeight,
} from "./ChartPrimitives.tsx";
import type {
  CategoryKeyOf,
  ChartFrameProps,
  ChartValueFormatter,
  NumericKeyOf,
} from "./Chart.types.ts";

export interface PieChartProps<
  TDatum extends object = Record<string, unknown>,
> extends ChartFrameProps {
  data: readonly TDatum[];
  /**
   * The property used to name each slice.
   */
  nameKey: CategoryKeyOf<TDatum>;
  /**
   * The numeric property used to size each slice.
   */
  valueKey: NumericKeyOf<TDatum>;
  /**
   * Slice colors. Values cycle when the data has more items than colors.
   */
  colors?: readonly string[];
  /**
   * Formats values in the legend and tooltip.
   */
  valueFormatter?: ChartValueFormatter;
  /**
   * Displays the slice legend.
   * @default true
   */
  showLegend?: boolean;
}

export function PieChart<TDatum extends object>({
  colors = CHART_COLORS,
  data,
  description,
  height,
  nameKey,
  showLegend = true,
  title,
  valueFormatter = defaultValueFormatter,
  valueKey,
  ...props
}: PieChartProps<TDatum>) {
  const accessibleTitle = props["aria-label"] ?? title ?? "Pie chart";
  const resolvedHeight = resolveChartHeight(height);
  const resolvedColors = colors.length > 0 ? colors : CHART_COLORS;
  const legendItems = data.map((item, index) => {
    const label = String(item[nameKey] ?? "");
    const value = Number(item[valueKey]);

    return {
      color: resolvedColors[index % resolvedColors.length],
      id: `${label}-${index}`,
      label,
      value: valueFormatter(value, label),
    };
  });

  return (
    <ChartFrame
      {...props}
      title={title}
      description={description}
      height={resolvedHeight}
      legend={showLegend ? <ChartLegend items={legendItems} /> : undefined}
    >
      <ResponsiveContainer initialDimension={getInitialChartDimensions(resolvedHeight)}>
        <RechartsPieChart accessibilityLayer desc={description} title={accessibleTitle}>
          <Pie<TDatum, number | string>
            data={data}
            dataKey={(item) => Number(item[valueKey])}
            innerRadius="48%"
            isAnimationActive={false}
            nameKey={(item) => String(item[nameKey])}
            outerRadius="78%"
            paddingAngle={2}
            stroke="var(--components-color-background)"
            strokeWidth={2}
          >
            {data.map((item, index) => (
              <Cell
                fill={resolvedColors[index % resolvedColors.length]}
                key={`${String(item[nameKey])}-${index}`}
              />
            ))}
          </Pie>
          <ChartTooltip valueFormatter={valueFormatter} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
