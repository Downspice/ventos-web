import { useState } from "react";
import * as yup from "yup";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CalendarDays } from "lucide-react";

const appointmentFormSchema = yup.object({
  customerId: yup.string().trim().required("Customer is required"),
  serviceId: yup.string().trim().required("Service is required"),
  employeeId: yup.string().trim().required("Staff member is required"),
  date: yup.string().trim().required("Date is required"),
  startTime: yup.string().trim().required("Start time is required"),
  endTime: yup
    .string()
    .trim()
    .required("End time is required")
    .test("is-after-start", "End time must be after start time", function (value) {
      const { startTime } = this.parent;
      if (!startTime || !value) return true;
      return value > startTime;
    }),
  notes: yup.string().trim().optional(),
});

type AppointmentFormData = yup.InferType<typeof appointmentFormSchema>;

interface NewAppointmentSheetProps {
  customers: { id: string; firstName: string; lastName: string }[];
  services: { id: string; name: string }[];
  employees: { id: string; firstName: string; lastName: string }[];
  defaultDate?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmitAppointment: (variables: {
    customerId: string;
    startAt: string;
    endAt: string;
    serviceIds: string[];
    assignedEmployeeIds: string[];
  }) => Promise<void>;
}

export function NewAppointmentSheet({
  customers,
  services,
  employees,
  defaultDate,
  isOpen,
  onOpenChange,
  onSubmitAppointment,
}: NewAppointmentSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const todayStr = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState<AppointmentFormData>({
    customerId: customers[0]?.id || "",
    serviceId: services[0]?.id || "",
    employeeId: employees[0]?.id || "",
    date: defaultDate || todayStr,
    startTime: "09:00",
    endTime: "10:00",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof AppointmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      await appointmentFormSchema.validate(formData, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const fieldErrors: Record<string, string> = {};
        err.inner.forEach((error) => {
          if (error.path && !fieldErrors[error.path]) {
            fieldErrors[error.path] = error.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Please resolve the form validation errors.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      await onSubmitAppointment({
        customerId: formData.customerId,
        startAt: startDateTime.toISOString(),
        endAt: endDateTime.toISOString(),
        serviceIds: [formData.serviceId],
        assignedEmployeeIds: [formData.employeeId],
      });

      toast.success("Appointment booked successfully!");
      setOpen(false);
      // Reset form
      setFormData({
        customerId: customers[0]?.id || "",
        serviceId: services[0]?.id || "",
        employeeId: employees[0]?.id || "",
        date: defaultDate || todayStr,
        startTime: "09:00",
        endTime: "10:00",
        notes: "",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to book appointment";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {isOpen === undefined && (
        <SheetTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <CalendarDays className="h-5 w-5 text-primary" />
            <SheetTitle className="text-xl">New Appointment</SheetTitle>
          </div>
          <SheetDescription>
            Schedule a service booking for a customer and assign staff.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Customer Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-select">Customer *</Label>
            <Select
              value={formData.customerId || null}
              onValueChange={(val) => handleChange("customerId", val ?? "")}
            >
              <SelectTrigger id="customer-select" className="w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <p className="text-xs text-destructive font-medium">{errors.customerId}</p>
            )}
          </div>

          {/* Service Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="service-select">Service *</Label>
            <Select
              value={formData.serviceId || null}
              onValueChange={(val) => handleChange("serviceId", val ?? "")}
            >
              <SelectTrigger id="service-select" className="w-full">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.serviceId && (
              <p className="text-xs text-destructive font-medium">{errors.serviceId}</p>
            )}
          </div>

          {/* Assigned Staff */}
          <div className="space-y-1.5">
            <Label htmlFor="staff-select">Assigned Staff *</Label>
            <Select
              value={formData.employeeId || null}
              onValueChange={(val) => handleChange("employeeId", val ?? "")}
            >
              <SelectTrigger id="staff-select" className="w-full">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && (
              <p className="text-xs text-destructive font-medium">{errors.employeeId}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="appointment-date">Date *</Label>
            <Input
              id="appointment-date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
            />
            {errors.date && (
              <p className="text-xs text-destructive font-medium">{errors.date}</p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-time">Start Time *</Label>
              <Input
                id="start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange("startTime", e.target.value)}
              />
              {errors.startTime && (
                <p className="text-xs text-destructive font-medium">{errors.startTime}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end-time">End Time *</Label>
              <Input
                id="end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange("endTime", e.target.value)}
              />
              {errors.endTime && (
                <p className="text-xs text-destructive font-medium">{errors.endTime}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Special Instructions</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific details or preferences..."
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
