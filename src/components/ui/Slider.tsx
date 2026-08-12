import { cn } from "../../utils/cn";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  icon?: string;
  onChange: (v: number) => void;
  onReset?: () => void;
}

export function Slider({ label, value, min, max, step = 1, icon, onChange, onReset }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = Math.round(value);
  const bipolar = min < 0;
  const isDefault = onReset && value === 0;

  return (
    <div className="select-none">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-[12px] opacity-60">{icon}</span> : null}
          <span className="text-[12.5px] font-medium text-zinc-200">{label}</span>
        </div>
        <button
          type="button"
          onClick={() => onReset?.()}
          className={cn(
            "tnum rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums transition-colors",
            isDefault ? "text-zinc-500" : "text-accent"
          )}
        >
          {display > 0 && bipolar ? `+${display}` : display}
        </button>
      </div>
      <input
        type="range"
        className="px-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ["--pct" as string]: `${pct}%` }}
      />
    </div>
  );
}
