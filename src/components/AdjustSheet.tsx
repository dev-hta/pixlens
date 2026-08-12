import { useApp } from "../store";
import { Slider } from "./ui/Slider";
import { IconClose } from "./icons";
import {
  DEFAULT_PARAMS,
  PARAM_CONTROLS,
  PARAM_GROUPS,
  SENSOR_PROFILES,
} from "../lib/config";
import { cn } from "../utils/cn";

export function AdjustSheet() {
  const { params, setParam, resetParams, profileId, setProfile, reprocessing, closeAdjust } = useApp();

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      {/* backdrop */}
      <button
        aria-label="Close"
        onClick={closeAdjust}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in"
      />

      {/* sheet */}
      <div className="glass-strong inset-hi relative max-h-[88%] animate-fade-up rounded-t-[28px] pb-2 pt-2">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />

        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <h3 className="text-[16px] font-bold text-white">Adjust</h3>
            <p className="text-[11px] text-white/45">Edits re-render live on the merged burst</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetParams}
              className="rounded-full border border-white/12 px-3 py-1.5 text-[12px] font-semibold text-white/80"
            >
              Reset
            </button>
            <button onClick={closeAdjust} className="icon-btn glass inset-hi h-9 w-9">
              <IconClose width={18} height={18} />
            </button>
          </div>
        </div>

        {/* reprocessing bar */}
        <div className="h-[3px] w-full overflow-hidden bg-transparent px-5">
          <div
            className={cn(
              "accent-grad h-full rounded-full transition-all duration-200",
              reprocessing ? "w-1/3 animate-pulse-soft" : "w-0"
            )}
          />
        </div>

        <div className="no-scrollbar max-h-[58vh] overflow-y-auto px-5 pb-5 pt-3">
          {/* Sensor profile */}
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-white/40">
            Sensor profile
          </p>
          <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {SENSOR_PROFILES.map((p) => (
              <button
                key={p.id}
                onClick={() => setProfile(p.id)}
                className={cn(
                  "flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  p.id === profileId ? "bg-white text-black" : "glass text-white/70"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>

          {PARAM_GROUPS.map((group) => (
            <div key={group} className="mb-5">
              <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wider text-white/40">
                {group}
              </p>
              <div className="space-y-4">
                {PARAM_CONTROLS.filter((c) => c.group === group).map((c) => (
                  <Slider
                    key={c.key}
                    label={c.label}
                    icon={c.icon}
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={params[c.key]}
                    onChange={(v) => setParam(c.key, v)}
                    onReset={() => setParam(c.key, DEFAULT_PARAMS[c.key])}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
