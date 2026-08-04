import { Bar, BarChart as RechartsBarChart, ResponsiveContainer } from "recharts";
import {
  ChartFrame,
  getChartColor,
  getInitialChartDimensions,
  resolveChartHeight,
} from "./ChartPrimitives.tsx";
import {
  CartesianChartElements,
  CARTESIAN_MARGIN,
  CARTESIAN_MARGIN_WITHOUT_Y_AXIS,
  SeriesLegend,
} from "./CartesianChart.tsx";
import type { CartesianChartProps } from "./CartesianChart.tsx";

export interface BarChartProps<
  TDatum extends object = Record<string, unknown>,
> extends CartesianChartProps<TDatum> {}

export function BarChart<TDatum extends object>({
  data,
  description,
  height,
  series,
  showLegend = series.length > 1,
  showYAxis = true,
  title,
  valueFormatter,
  xKey,
  ...props
}: BarChartProps<TDatum>) {
  const accessibleTitle = props["aria-label"] ?? title ?? "Bar chart";
  const resolvedHeight = resolveChartHeight(height);

  return (
    <ChartFrame
      {...props}
      title={title}
      description={description}
      height={resolvedHeight}
      legend={showLegend ? <SeriesLegend series={series} /> : undefined}
    >
      <ResponsiveContainer initialDimension={getInitialChartDimensions(resolvedHeight)}>
        <RechartsBarChart
          accessibilityLayer
          barCategoryGap="28%"
          data={data}
          desc={description}
          margin={showYAxis ? CARTESIAN_MARGIN : CARTESIAN_MARGIN_WITHOUT_Y_AXIS}
          title={accessibleTitle}
        >
          <CartesianChartElements
            minTickGap={16}
            showYAxis={showYAxis}
            tooltipVariant="bar"
            valueFormatter={valueFormatter}
            xKey={xKey}
          />
          {series.map((item, index) => (
            <Bar<TDatum, number>
              dataKey={item.dataKey}
              fill={getChartColor(index, item.color)}
              isAnimationActive={false}
              key={item.dataKey}
              maxBarSize={48}
              name={item.label ?? item.dataKey}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
