import { useRef } from "react";
import { Palette } from "lucide-react";

const colorPresets = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#84cc16", "#a855f7", "#0ea5e9", "#e11d48", "#d946ef",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  testIdPrefix?: string;
}

export function ColorPicker({ value, onChange, testIdPrefix = "color" }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPreset = colorPresets.includes(value);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {colorPresets.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full transition-all cursor-pointer ${value === c ? "ring-2 ring-offset-2 ring-primary" : "hover:opacity-80"}`}
          style={{ backgroundColor: c }}
          data-testid={`button-${testIdPrefix}-${c}`}
        />
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-7 h-7 rounded-full transition-all cursor-pointer border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:opacity-80 ${!isPreset ? "ring-2 ring-offset-2 ring-primary" : ""}`}
        style={!isPreset ? { backgroundColor: value } : undefined}
        title="カスタムカラーを選択"
        data-testid={`button-${testIdPrefix}-custom`}
      >
        {isPreset && <Palette className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="sr-only"
        data-testid={`input-${testIdPrefix}-custom`}
      />
    </div>
  );
}

export { colorPresets };
