"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import type { Control } from "react-hook-form"

interface SwitchWrapperProps {
  control: Control<any>
  name: string
  label: string
  description?: string
  disabled?: boolean
}

export default function SwitchWrapper({ control, name, label, description, disabled = false }: SwitchWrapperProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-base">{label}</FormLabel>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
