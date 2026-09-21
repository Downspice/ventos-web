import { useId, type FormEventHandler, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/utils/cn";

const STEP_LABELS = ["General", "Attributes", "Expiry & discounts"] as const;

type ProductStepFormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  step: number;
  onStepChange: (step: number) => void;
  canAdvanceFromStep: (step: number) => boolean;
  children: ReactNode;
};

export function ProductStepFormDrawer({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  step,
  onStepChange,
  canAdvanceFromStep,
  children,
}: ProductStepFormDrawerProps) {
  const formId = useId();
  const isLast = step >= STEP_LABELS.length - 1;

  function goNext() {
    if (!canAdvanceFromStep(step)) return;
    if (!isLast) onStepChange(step + 1);
  }

  function goBack() {
    if (step > 0) onStepChange(step - 1);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader className="border-b pb-4">
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
            <nav aria-label="Product form steps" className="pt-3">
              <ol className="flex gap-2">
                {STEP_LABELS.map((label, index) => {
                  const active = index === step;
                  const done = index < step;
                  return (
                    <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                          active && "bg-primary text-primary-foreground",
                          done && !active && "bg-primary/20 text-primary",
                          !active && !done && "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          "w-full truncate text-center text-[10px] leading-tight sm:text-xs",
                          active ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <form id={formId} onSubmit={onSubmit} className="grid gap-4">
              {children}
            </form>
          </div>
          <SheetFooter className="flex-row justify-between gap-2 border-t sm:justify-between">
            <div className="flex gap-2">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={goBack}>
                  Back
                </Button>
              ) : null}
            </div>
            {isLast ? (
              <Button type="submit" form={formId}>
                {submitLabel}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                disabled={!canAdvanceFromStep(step)}
              >
                Next
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}

export const PRODUCT_FORM_STEP_COUNT = STEP_LABELS.length;
