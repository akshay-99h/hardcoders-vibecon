import * as React from "react";
import { cn } from "../../lib/utils";

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  labelFormatter,
  formatter,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const renderedLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      {renderedLabel !== undefined && renderedLabel !== null && (
        <p className="text-xs font-medium text-muted-foreground mb-1">{String(renderedLabel)}</p>
      )}
      <div className="space-y-1">
        {payload.map((item) => {
          const key = `${item.dataKey || item.name}-${item.value}`;
          const name = String(item.name || item.dataKey || "value").replace(/_/g, " ");
          const value = formatter
            ? formatter(item.value, item.name, item)
            : item.value;

          return (
            <div key={key} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color || "var(--primary)" }}
                />
                <span className="capitalize">{name}</span>
              </div>
              <span className="font-semibold text-foreground">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartTooltipContent };
