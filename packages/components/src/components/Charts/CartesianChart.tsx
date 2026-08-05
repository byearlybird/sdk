import { CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartLegend, ChartTooltip, getChartColor } from "./ChartPrimitives.tsx";
import type {
  CategoryKeyOf,
  ChartFrameProps,
  ChartSeries,
  ChartValueFormatter,
} from "./Chart.types.ts";

export const CARTESIAN_MARGIN = { bottom: 0, left: 0, right: 8, top: 8 };
export const CARTESIAN_MARGIN_WITHOUT_Y_AXIS = { bottom: 0, left: 8, right: 8, top: 8 };

const AXIS_TICK = { fill: "var(--eb-color-text)", fontSize: 12 };
const LINE_TOOLTIP_CURSOR = {
  stroke: "var(--eb-color-border)",
  strokeDasharray: "3 3",
  strokeWidth: 1,
};
const BAR_TOOLTIP_CURSOR = { fill: "var(--eb-color-muted)", opacity: 0.45 };
const AXIS_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});

export interface CartesianChartProps<TDatum extends object> extends ChartFrameProps {
  data: readonly TDatum[];
  /**
   * The categorical property displayed along the horizontal axis.
   */
  xKey: CategoryKeyOf<TDatum>;
  series: readonly ChartSeries<TDatum>[];
  /**
   * Formats values in the tooltip.
   */
  valueFormatter?: ChartValueFormatter;
  /**
   * Displays the series legend.
   * @default true when more than one series is present
   */
  showLegend?: boolean;
  /**
   * Displays the vertical value axis.
   * @default true
   */
  showYAxis?: boolean;
}

export function SeriesLegend<TDatum extends object>({
  series,
}: {
  series: readonly ChartSeries<TDatum>[];
}) {
  return (
    <ChartLegend
      items={series.map((item, index) => ({
        color: getChartColor(index, item.color),
        id: item.dataKey,
        label: item.label ?? item.dataKey,
      }))}
    />
  );
}

export function CartesianChartElements<TDatum extends object>({
  minTickGap,
  showYAxis,
  tooltipVariant,
  valueFormatter,
  xKey,
}: {
  minTickGap: number;
  showYAxis: boolean;
  tooltipVariant: "bar" | "line";
  valueFormatter?: ChartValueFormatter;
  xKey: CategoryKeyOf<TDatum>;
}) {
  return (
    <>
      <CartesianGrid stroke="var(--eb-color-muted)" vertical={false} />
      <XAxis<TDatum, number | string>
        axisLine={false}
        dataKey={xKey}
        minTickGap={minTickGap}
        tick={AXIS_TICK}
        tickLine={false}
        tickMargin={12}
      />
      {showYAxis ? (
        <YAxis
          axisLine={false}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => AXIS_NUMBER_FORMATTER.format(value)}
          tickLine={false}
          tickMargin={8}
          width={44}
        />
      ) : null}
      <ChartTooltip
        cursor={tooltipVariant === "line" ? LINE_TOOLTIP_CURSOR : BAR_TOOLTIP_CURSOR}
        valueFormatter={valueFormatter}
      />
    </>
  );
}
