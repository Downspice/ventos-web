import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";

export type PosCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
};

function customerLabel(c: PosCustomer) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (c.phone?.trim()) return `${name} · ${c.phone.trim()}`;
  if (c.email?.trim()) return `${name} · ${c.email.trim()}`;
  return name || "Customer";
}

type Props = {
  customers: PosCustomer[];
  value: string | null;
  onChange: (customerId: string | null) => void;
  disabled?: boolean;
};

export function PosCustomerSelect({ customers, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value ? customers.find((c) => c.id === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? customerLabel(selected) : "Walk-in customer"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search customers…" />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="walk-in customer"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 size-4", value ? "opacity-0" : "opacity-100")} />
                Walk-in customer
              </CommandItem>
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={customerLabel(c)}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === c.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {customerLabel(c)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
