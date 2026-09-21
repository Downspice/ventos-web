"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import type { Control, FieldValues, Path } from "react-hook-form";
import { cn, isFieldEmpty } from "@/lib/shared/utils";

interface CheckboxOption {
  id: string;
  name: string;
  description?: string;
}

interface CheckboxWrapperProps<TFieldValues extends FieldValues = any> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  options: CheckboxOption[];
  disabled?: boolean;
  required?: boolean;
}

export default function CheckboxWrapper<TFieldValues extends FieldValues = any>({
  control,
  name,
  label,
  options,
  disabled = false,
  required = false,
}: CheckboxWrapperProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const isMissingRequired = required && isFieldEmpty(field.value);

        return (
          <FormItem>
            <div className="mb-4">
              <FormLabel className={cn("text-base", isMissingRequired && "text-red-500")}>
                {label}
              </FormLabel>
            </div>
          <div className="grid grid-cols-4">
            {options.map((option) => (
              <FormField
                key={option.id}
                control={control}
                name={name}
                render={({ field }) => {
                  return (
                    <FormItem
                      key={option.id}
                      className="col-span-1 flex flex-row items-start space-x-3 space-y-0 mb-2"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(option.id)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            const newValues = checked
                              ? [...currentValues, option.id]
                              : currentValues.filter(
                                  (id: string) => id !== option.id
                                );
                            field.onChange(newValues);
                          }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          {option.name}
                        </FormLabel>
                        {/* {option.description && (
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        )} */}
                      </div>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
        );
      }}
    />
  );
}
