import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

type ListSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function ListSearchField({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: ListSearchFieldProps) {
  return (
    <div className={cn("relative min-w-[200px] max-w-md flex-1", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}
