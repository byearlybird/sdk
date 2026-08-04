import { Line, LineChart as RechartsLineChart, ResponsiveContainer } from "recharts";
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

export interface LineChartProps<
  TDatum extends object = Record<string, unknown>,
> extends CartesianChartProps<TDatum> {}

export function LineChart<TDatum extends object>({
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
}: LineChartProps<TDatum>) {
  const accessibleTitle = props["aria-label"] ?? title ?? "Line chart";
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
        <RechartsLineChart
          accessibilityLayer
          data={data}
          desc={description}
          margin={showYAxis ? CARTESIAN_MARGIN : CARTESIAN_MARGIN_WITHOUT_Y_AXIS}
          title={accessibleTitle}
        >
          <CartesianChartElements
            minTickGap={24}
            showYAxis={showYAxis}
            tooltipVariant="line"
            valueFormatter={valueFormatter}
            xKey={xKey}
          />
          {series.map((item, index) => {
            const color = getChartColor(index, item.color);

            return (
              <Line<TDatum, number>
                activeDot={{
                  fill: "var(--components-color-background)",
                  r: 5,
                  stroke: color,
                  strokeWidth: 2,
                }}
                dataKey={item.dataKey}
                dot={false}
                isAnimationActive={false}
                key={item.dataKey}
                name={item.label ?? item.dataKey}
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                type="monotone"
              />
            );
          })}
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
