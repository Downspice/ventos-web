"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Control, FieldValues, Path } from "react-hook-form";
import { cn, isFieldEmpty } from "@/lib/shared/utils";

interface InputWrapperProps<TFieldValues extends FieldValues = any> {
  control: Control<TFieldValues>;
  label: string;
  name: Path<TFieldValues>;
  type?: string;
  className?: string;
  value?: any;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  warning?: string;
  direction?: "horizontal" | "vertical"; // NEW
}

export default function InputWrapper<TFieldValues extends FieldValues = any>({
  control,
  name,
  label,
  type,
  className,
  placeholder,
  disabled = false,
  required = false,
  readOnly = false,
  warning,
  direction = "horizontal", // default
}: InputWrapperProps<TFieldValues> & { readOnly?: boolean }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
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

          <div className="flex-1 flex flex-col">
            <FormControl>
              <Input
                type={type??"text"}
                placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                className={className}
                disabled={disabled}
                readOnly={readOnly}
                {...field}
              />
            </FormControl>
            <FormMessage />
            {warning && (
              <span className="text-xs text-amber-500 mt-1">{warning}</span>
            )}
          </div>
        </FormItem>
        );
      }}
    />
  );
}
