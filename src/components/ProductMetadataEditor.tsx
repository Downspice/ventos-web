import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ProductMetadataFieldDef = {
  id?: string;
  productTypeId?: string | null;
  key: string;
  label: string;
  valueType: "TEXT" | "NUMBER" | "SELECT";
  unit?: string | null;
  options: string[];
  active?: boolean;
};

type Props = {
  fields: ProductMetadataFieldDef[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
  loading?: boolean;
};

export function ProductMetadataEditor({ fields, values, onChange, disabled, loading }: Props) {
  if (loading) {
    return (
      <div className="grid gap-3 border-t pt-4">
        <p className="text-sm font-medium">Product attributes</p>
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active metadata fields for this product type. Open{" "}
        <a href="/product-metadata" className="text-primary underline-offset-4 hover:underline">
          Metadata fields
        </a>{" "}
        and add fields for the type (or turn on &quot;Active&quot; for existing ones).
      </p>
    );
  }

  function setKey(key: string, value: string) {
    const next = { ...values };
    if (value.trim() === "") delete next[key];
    else next[key] = value;
    onChange(next);
  }

  return (
    <div className="grid gap-3 border-t pt-4">
      <p className="text-sm font-medium">Product attributes</p>
      {fields.map((field) => {
        const id = `meta-${field.key}`;
        const value = values[field.key] ?? "";
        const unitHint = field.unit ? ` (${field.unit})` : "";

        if (field.valueType === "SELECT" && field.options.length > 0) {
          return (
            <div key={field.key} className="grid gap-1">
              <Label htmlFor={id}>{field.label}</Label>
              <Select
                value={value || null}
                onValueChange={(v) => setKey(field.key, v ?? "")}
                disabled={disabled}
              >
                <SelectTrigger id={id} className="h-10">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        return (
          <div key={field.key} className="grid gap-1">
            <Label htmlFor={id}>
              {field.label}
              {unitHint}
            </Label>
            <Input
              id={id}
              type={field.valueType === "NUMBER" ? "number" : "text"}
              step={field.valueType === "NUMBER" ? "any" : undefined}
              value={value}
              disabled={disabled}
              onChange={(e) => setKey(field.key, e.target.value)}
              placeholder={field.valueType === "NUMBER" ? "0" : "Optional"}
            />
          </div>
        );
      })}
    </div>
  );
}
