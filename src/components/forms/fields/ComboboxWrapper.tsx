"use client";
import { Check, ChevronsUpDown, X } from "lucide-react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useState, useMemo } from "react";

import { cn, isFieldEmpty } from "@/lib/shared/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface ComboboxOption {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  label: string;
  name: Path<TFieldValues>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  warning?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  direction?: "horizontal" | "vertical";
  showLabel?: boolean;
}

interface ComboboxFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  options: ComboboxOption[];
}

export function ComboboxFieldWrapper<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  name,
  label,
  options = [],
  className,
  placeholder,
  disabled = false,
  required = false,
  warning,
  emptyText = "No option found.",
  searchPlaceholder = "Search...",
  direction = "horizontal",
  showLabel = true,
}: ComboboxFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(
      (option) =>
        option.name?.toLowerCase().includes(search.toLowerCase()) ||
        option.id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const handleSelect = (id: string) => {
          const option = options.find((opt) => opt.id === id);
          if (option) {
            field.onChange(option.id);
            setOpen(false);
            setSearch("");
          }
        };

        const isMissingRequired = required && isFieldEmpty(field.value);

        return (
          <FormItem
            className={cn(
              "w-full",
              direction === "horizontal"
                ? "flex items-center gap-4"
                : "flex flex-col"
            )}
          >
            {showLabel && (
              <FormLabel
                className={cn(
                  direction === "horizontal"
                    ? "w-[10rem] flex items-center justify-end text-right shrink-0"
                    : "mb-1",
                  isMissingRequired && "text-red-500"
                )}
              >
                {label}
              </FormLabel>
            )}

            <div className="flex-1 flex flex-col">
              <Popover
                open={open}
                onOpenChange={(newOpen) => {
                  setOpen(newOpen);
                  if (!newOpen) setSearch("");
                }}
              >
                <FormControl>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground",
                          className
                        )}
                      >
                        {field.value
                          ? options.find((o) => o.id === field.value)?.name
                          : placeholder || `Select ${label.toLowerCase()}`}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    }
                  />
                </FormControl>

                <PopoverContent
                  className="w-[300px] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={searchPlaceholder}
                      value={search}
                      onValueChange={setSearch}
                      autoFocus
                    />
                    <CommandList>
                      <CommandEmpty>{emptyText}</CommandEmpty>
                      <CommandGroup>
                        {filteredOptions.map((option) => (
                          <CommandItem
                            key={option.id}
                            value={option.name}
                            onSelect={() => handleSelect(option.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                option.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {option.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <FormMessage />
              {warning && (
                <p className="text-xs text-muted-foreground mt-1">{warning}</p>
              )}
            </div>
          </FormItem>
        );
      }}
    />
  );
}

interface MultiComboboxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
> extends BaseFieldProps<TFieldValues> {
  options: ComboboxOption[];
  minSelections?: number;
  maxSelections?: number;
}

export function MultiComboboxWrapper<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  name,
  label,
  options = [],
  className,
  placeholder,
  disabled = false,
  required = false,
  warning,
  emptyText = "No option found.",
  searchPlaceholder = "Search...",
  minSelections,
  maxSelections,
  direction = "horizontal",
  showLabel = true,
}: MultiComboboxFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(
      (option) =>
        option.name?.toLowerCase().includes(search.toLowerCase()) ||
        option.id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedValues: string[] = Array.isArray(field.value) ? field.value : [];
        const selectedOptions = options.filter((o) =>
          selectedValues.includes(o.id)
        );

        const handleSelect = (id: string) => {
          const current = selectedValues;
          if (current.includes(id)) {
            field.onChange(current.filter((v: string) => v !== id));
          } else {
            if (maxSelections && current.length >= maxSelections) return;
            field.onChange([...current, id]);
          }
        };

        const handleRemove = (id: string) => {
          field.onChange(selectedValues.filter((v: string) => v !== id));
        };

        const isMissingRequired = required && isFieldEmpty(field.value);

        return (
          <FormItem
            className={cn(
              "w-full",
              direction === "horizontal"
                ? "flex items-center gap-4"
                : "flex flex-col"
            )}
          >
            {showLabel && (
              <FormLabel
                className={cn(
                  direction === "horizontal"
                    ? "w-[10rem] flex items-center justify-end text-right shrink-0"
                    : "mb-1",
                  isMissingRequired && "text-red-500"
                )}
              >
                {label}
              </FormLabel>
            )}

            <div className="flex-1 flex flex-col">
              {selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50 mb-2">
                  {selectedOptions.map((option) => (
                    <Badge
                      key={option.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {option.name}
                      <button
                        type="button"
                        onClick={() => handleRemove(option.id)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <Popover
                open={open}
                onOpenChange={(newOpen) => {
                  setOpen(newOpen);
                  if (!newOpen) setSearch("");
                }}
              >
                <FormControl>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                          "w-full justify-between",
                          selectedValues.length === 0 && "text-muted-foreground",
                          className
                        )}
                      >
                        {selectedValues.length > 0
                          ? `${selectedValues.length} selected`
                          : placeholder || `Select ${label.toLowerCase()}`}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    }
                  />
                </FormControl>

                <PopoverContent
                  className="w-[300px] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={searchPlaceholder}
                      value={search}
                      onValueChange={setSearch}
                      autoFocus
                    />
                    <CommandList>
                      <CommandEmpty>{emptyText}</CommandEmpty>
                      <CommandGroup>
                        {filteredOptions.map((option) => {
                          const isSelected = selectedValues.includes(
                            option.id
                          );
                          const isDisabled =
                            !isSelected &&
                            !!maxSelections &&
                            selectedValues.length >= maxSelections;
                          return (
                            <CommandItem
                              key={option.id}
                              value={option.name}
                              onSelect={() => handleSelect(option.id)}
                              className={cn(
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {option.name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <FormMessage />
              {(warning || minSelections) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {warning || (minSelections ? `Please select at least ${minSelections} item${minSelections > 1 ? "s" : ""}.` : "")}
                </p>
              )}
            </div>
          </FormItem>
        );
      }}
    />
  );
}
