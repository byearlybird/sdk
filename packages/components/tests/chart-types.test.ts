import { expectTypeOf, test } from "vite-plus/test";
import type { ChartSeries, LineChartProps, PieChartProps } from "../src/charts.ts";

interface ChartDatum {
  active: boolean;
  label: string;
  metadata: object;
  optionalValue?: number;
  order: number;
  unknownValue: unknown;
  value: number;
}

test("chart keys are constrained by their value type", () => {
  expectTypeOf<ChartSeries<ChartDatum>["dataKey"]>().toEqualTypeOf<"order" | "value">();
  expectTypeOf<LineChartProps<ChartDatum>["xKey"]>().toEqualTypeOf<"label" | "order" | "value">();
  expectTypeOf<PieChartProps<ChartDatum>["nameKey"]>().toEqualTypeOf<"label" | "order" | "value">();
  expectTypeOf<PieChartProps<ChartDatum>["valueKey"]>().toEqualTypeOf<"order" | "value">();
});
