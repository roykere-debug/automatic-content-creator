import { Gauge } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface RelevanceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function RelevanceSlider({ value, onChange }: RelevanceSliderProps) {
  const getQualityLabel = (val: number) => {
    if (val <= 3) return { label: "LOW", color: "text-destructive" };
    if (val <= 5) return { label: "MEDIUM", color: "text-status-pending" };
    if (val <= 7) return { label: "HIGH", color: "text-primary" };
    return { label: "STRICT", color: "text-status-sent" };
  };

  const quality = getQualityLabel(value);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-medium">Relevance Threshold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-2xl font-bold ${quality.color}`}>
            {value}
          </span>
          <span className="font-mono text-sm text-muted-foreground">/10</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <Slider
            value={[value]}
            onValueChange={([val]) => onChange(val)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">PERMISSIVE</span>
            <Badge variant={value > 5 ? "tactical" : "outline"}>
              {quality.label}
            </Badge>
            <span className="font-mono text-[10px] text-muted-foreground">STRICT</span>
          </div>
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          Articles scoring below <span className="text-primary font-bold">{value}</span> will be
          automatically filtered out during scans. Higher values mean stricter filtering.
        </p>
      </div>
    </div>
  );
}
