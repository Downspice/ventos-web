import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import { normalizeScannedBarcode } from "@/lib/barcode";

type BarcodeScanInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** Focus this field when the parent form opens (for wedge scanners). */
  focusWhen?: boolean;
  /** Called when the scanner sends Enter after a scan (Enter does not submit the form). */
  onScan?: (barcode: string) => void;
};

export function BarcodeScanInput({
  focusWhen,
  onScan,
  className,
  onKeyDown,
  onChange,
  value,
  ...props
}: BarcodeScanInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusWhen) return;
    const timer = window.setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 150);
    return () => clearTimeout(timer);
  }, [focusWhen]);

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      autoCorrect="off"
      data-1p-ignore
      data-lpignore="true"
      value={value}
      onChange={onChange}
      className={cn("font-mono tracking-wide", className)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          const raw =
            typeof value === "string" ? value : (e.currentTarget as HTMLInputElement).value;
          const code = normalizeScannedBarcode(raw);
          if (code) onScan?.(code);
        }
        onKeyDown?.(e);
      }}
      {...props}
    />
  );
}
