import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import type { DataKey } from "recharts";

export type DataKeyOfType<TDatum, TValue> = Extract<DataKey<TDatum, TValue>, keyof TDatum & string>;
export type NumericKeyOf<TDatum> = DataKeyOfType<TDatum, number>;
export type CategoryKeyOf<TDatum> = DataKeyOfType<TDatum, number | string>;

export type ChartValueFormatter = (value: number, name: string) => ReactNode;

export interface ChartSeries<TDatum extends object = Record<string, unknown>> {
  /**
   * The numeric property to plot.
   */
  dataKey: NumericKeyOf<TDatum>;
  /**
   * The human-readable series name used in the legend and tooltip.
   * @default dataKey
   */
  label?: string;
  /**
   * A CSS color value. The component theme colors are used when omitted.
   */
  color?: string;
}

export interface ChartFrameProps extends Omit<
  ComponentPropsWithoutRef<"figure">,
  "children" | "title"
> {
  /**
   * A ref to the rendered figure.
   */
  ref?: Ref<HTMLElement>;
  /**
   * A visible heading for the chart.
   */
  title?: string;
  /**
   * Supporting context shown below the title.
   */
  description?: string;
  /**
   * The positive plot height in pixels.
   */
  height?: number;
}
