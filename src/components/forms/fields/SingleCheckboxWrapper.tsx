"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import type { Control } from "react-hook-form"

interface SingleCheckboxWrapperProps {
  control: Control<any>
  name: string
  label: string
  description?: string
  disabled?: boolean
}

export default function SingleCheckboxWrapper({
  control,
  name,
  label,
  description,
  disabled = false,
}: SingleCheckboxWrapperProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="font-normal">{label}</FormLabel>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
