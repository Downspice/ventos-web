"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import type { Control, FieldValues, Path } from "react-hook-form"

import { cn, isFieldEmpty } from "@/lib/shared/utils"

interface TextareaWrapperProps<TFieldValues extends FieldValues = any> {
  control: Control<TFieldValues>
  name: Path<TFieldValues>
  label?: string
  className?: string
  value?: any
  placeholder?: string
  rows?: number
  disabled?: boolean
  required?: boolean
  direction?: "horizontal" | "vertical"
}

export default function TextareaWrapper({
  control,
  name,
  label,
  className,
  placeholder,
  rows = 4,
  disabled = false,
  required = false,
  direction = "horizontal",
}: TextareaWrapperProps) {
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
              direction === "horizontal" && label
                ? "flex items-start gap-4"
                : "flex flex-col"
            )}
          >
            {label ? (
              <FormLabel
                className={cn(
                  direction === "horizontal"
                    ? "w-[10rem] flex items-start justify-end text-right shrink-0 pt-2"
                    : "mb-1",
                  isMissingRequired && "text-red-500"
                )}
              >
                {label}
              </FormLabel>
            ) : null}
            <div className="flex-1 w-full flex flex-col">
              <FormControl>
                <Textarea
                  placeholder={
                    placeholder !== undefined
                      ? placeholder
                      : label
                      ? `Enter ${label.toLowerCase()}`
                      : ""
                  }
                  className={className}
                  rows={rows}
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </div>
          </FormItem>
        );
      }}
    />
  );
}
