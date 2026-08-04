import { clsx } from "clsx";
import type { CSSProperties, ReactNode, SVGProps } from "react";
import { Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import styles from "./ChartPrimitives.module.css";
import type { ChartFrameProps, ChartValueFormatter } from "./Chart.types.ts";

export const CHART_COLORS = [
  "var(--components-color-primary)",
  "var(--components-color-border)",
  "var(--color-red-700)",
] as const;

const DEFAULT_CHART_HEIGHT = 280;
const INITIAL_CHART_WIDTH = 640;
const TOOLTIP_NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

interface ChartFrameInternalProps extends ChartFrameProps {
  children: ReactNode;
  legend?: ReactNode;
}

interface ChartStyle extends CSSProperties {
  "--chart-height"?: string;
}

interface ChartLegendItem {
  color: string;
  id: string;
  label: string;
  value?: ReactNode;
}

function getChartStyle(height: number | undefined, style: CSSProperties | undefined) {
  const chartStyle: ChartStyle = { ...style };

  if (height !== undefined) {
    chartStyle["--chart-height"] = `${height}px`;
  }

  return chartStyle;
}

export function resolveChartHeight(height: number | undefined) {
  return height !== undefined && Number.isFinite(height) && height > 0 ? height : undefined;
}

export function getInitialChartDimensions(height: number | undefined) {
  return {
    height: height ?? DEFAULT_CHART_HEIGHT,
    width: INITIAL_CHART_WIDTH,
  };
}

export function getChartColor(index: number, color?: string) {
  return color ?? CHART_COLORS[index % CHART_COLORS.length];
}

export function defaultValueFormatter(value: number) {
  return TOOLTIP_NUMBER_FORMATTER.format(value);
}

export function ChartFrame({
  "aria-label": ariaLabel,
  children,
  className,
  description,
  height,
  legend,
  ref,
  style,
  title,
  ...props
}: ChartFrameInternalProps) {
  return (
    <figure
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      className={clsx(styles.figure, className)}
      style={getChartStyle(height, style)}
    >
      {title !== undefined || description !== undefined ? (
        <figcaption className={styles.header}>
          {title !== undefined ? <div className={styles.title}>{title}</div> : null}
          {description !== undefined ? (
            <div className={styles.description}>{description}</div>
          ) : null}
        </figcaption>
      ) : null}
      <div className={styles.plot}>{children}</div>
      {legend}
    </figure>
  );
}

export function ChartLegend({ items }: { items: readonly ChartLegendItem[] }) {
  return (
    <ul aria-label="Chart legend" className={styles.legend}>
      {items.map((item) => (
        <li className={styles.legendItem} key={item.id}>
          <span
            aria-hidden="true"
            className={styles.legendMarker}
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
          {item.value !== undefined ? <strong>{item.value}</strong> : null}
        </li>
      ))}
    </ul>
  );
}

function ChartTooltipContent({
  active,
  label,
  payload,
  valueFormatter = defaultValueFormatter,
}: TooltipContentProps & { valueFormatter?: ChartValueFormatter }) {
  if (!active || payload === undefined || payload.length === 0) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      {label !== undefined ? <div className={styles.tooltipLabel}>{label}</div> : null}
      <dl className={styles.tooltipList}>
        {payload.map((item, index) => {
          const name = String(item.name ?? item.dataKey ?? "");
          const value = typeof item.value === "number" ? item.value : Number(item.value);

          return (
            <div className={styles.tooltipRow} key={`${name}-${index}`}>
              <dt>
                <span
                  aria-hidden="true"
                  className={styles.tooltipMarker}
                  style={{ backgroundColor: item.color }}
                />
                {name}
              </dt>
              <dd>{valueFormatter(value, name)}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function ChartTooltip({
  cursor,
  valueFormatter,
}: {
  cursor?: SVGProps<SVGElement>;
  valueFormatter?: ChartValueFormatter;
}) {
  return (
    <Tooltip
      content={(tooltipProps) => (
        <ChartTooltipContent {...tooltipProps} valueFormatter={valueFormatter} />
      )}
      cursor={cursor}
    />
  );
}
