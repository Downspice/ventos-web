import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarArrowDown,
  CalendarDays,
  Search,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarMonthSkeleton } from "@/components/loading-skeletons";
import { NewAppointmentSheet } from "@/components/appointments/NewAppointmentSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";

const APPTS = gql`
  query AppointmentsPage {
    appointments {
      id
      customerId
      startAt
      endAt
      status
      assignedEmployeeIds
      serviceIds
      notes
    }
    customers {
      id
      firstName
      lastName
    }
    services {
      id
      name
    }
    employees {
      id
      firstName
      lastName
    }
  }
`;

const CREATE = gql`
  mutation CreateAppt(
    $customerId: ID!
    $startAt: String!
    $endAt: String!
    $serviceIds: [ID!]!
    $assignedEmployeeIds: [ID!]!
  ) {
    createAppointment(
      customerId: $customerId
      startAt: $startAt
      endAt: $endAt
      serviceIds: $serviceIds
      assignedEmployeeIds: $assignedEmployeeIds
    ) {
      id
    }
  }
`;

interface Appointment {
  id: string;
  customerId: string;
  startAt: string;
  endAt: string;
  status: string;
  assignedEmployeeIds: string[];
  serviceIds: string[];
  notes?: string | null;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
}

interface Service {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const shortMonthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AppointmentsPage() {
  const { data, loading, refetch } = useQuery<{
    appointments?: Appointment[];
    customers?: Customer[];
    services?: Service[];
    employees?: Employee[];
  }>(APPTS);

  const [createAppointment] = useMutation(CREATE);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [selectedServiceId, setSelectedServiceId] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Quick book on day click
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [selectedDateForBooking, setSelectedDateForBooking] = useState<string | undefined>(undefined);

  const customersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    data?.customers?.forEach((c) => map.set(c.id, c));
    return map;
  }, [data?.customers]);

  const servicesMap = useMemo(() => {
    const map = new Map<string, Service>();
    data?.services?.forEach((s) => map.set(s.id, s));
    return map;
  }, [data?.services]);

  const employeesMap = useMemo(() => {
    const map = new Map<string, Employee>();
    data?.employees?.forEach((e) => map.set(e.id, e));
    return map;
  }, [data?.employees]);

  // Month navigation helpers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const goToFirstMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), 0, 1));
  };

  const goToLastMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), 11, 1));
  };

  const goToSpecificMonth = (year: number, month: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  // 13-month quick jump list (like in maintenance-test-environment)
  const quickNavigationMonths = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    return Array.from({ length: 13 }, (_, i) => {
      const offset = i - 6; // index 6 is current month
      const date = new Date(currentYear, currentMonth + offset, 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        name: shortMonthNames[date.getMonth()],
        isCurrent: offset === 0,
      };
    });
  }, [currentDate]);

  // Calendar cells generation (42 cells: 6 weeks x 7 days)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: {
      day: number;
      isCurrentMonth: boolean;
      isPrevMonth: boolean;
      date: Date;
      dateStr: string;
    }[] = [];

    // Previous month filler days
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isPrevMonth: true,
        date: d,
        dateStr: d.toISOString().split("T")[0],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      days.push({
        day: day,
        isCurrentMonth: true,
        isPrevMonth: false,
        date: d,
        dateStr: d.toISOString().split("T")[0],
      });
    }

    // Next month filler days
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const d = new Date(year, month + 1, day);
      days.push({
        day: day,
        isCurrentMonth: false,
        isPrevMonth: false,
        date: d,
        dateStr: d.toISOString().split("T")[0],
      });
    }

    return days;
  }, [currentDate]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    const appts = data?.appointments || [];
    return appts.filter((appt) => {
      // Status filter
      if (statusTab !== "all" && appt.status.toUpperCase() !== statusTab.toUpperCase()) {
        return false;
      }
      // Staff filter
      if (
        selectedEmployeeId !== "all" &&
        !appt.assignedEmployeeIds.includes(selectedEmployeeId)
      ) {
        return false;
      }
      // Service filter
      if (
        selectedServiceId !== "all" &&
        !appt.serviceIds.includes(selectedServiceId)
      ) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const customer = customersMap.get(appt.customerId);
        const customerName = customer
          ? `${customer.firstName} ${customer.lastName}`.toLowerCase()
          : "";
        const serviceNames = appt.serviceIds
          .map((id) => servicesMap.get(id)?.name?.toLowerCase() || "")
          .join(" ");
        const staffNames = appt.assignedEmployeeIds
          .map((id) => {
            const e = employeesMap.get(id);
            return e ? `${e.firstName} ${e.lastName}`.toLowerCase() : "";
          })
          .join(" ");
        const statusMatch = appt.status.toLowerCase().includes(query);

        if (
          !customerName.includes(query) &&
          !serviceNames.includes(query) &&
          !staffNames.includes(query) &&
          !statusMatch
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    data?.appointments,
    statusTab,
    selectedEmployeeId,
    selectedServiceId,
    searchTerm,
    customersMap,
    servicesMap,
    employeesMap,
  ]);

  // Map appointments by date string (YYYY-MM-DD)
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filteredAppointments.forEach((appt) => {
      try {
        const d = new Date(appt.startAt);
        if (!isNaN(d.getTime())) {
          const dateKey = d.toISOString().split("T")[0];
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey)!.push(appt);
        }
      } catch {
        // ignore invalid dates
      }
    });
    return map;
  }, [filteredAppointments]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todaysAppointments = useMemo(
    () => appointmentsByDate.get(todayStr) ?? [],
    [appointmentsByDate, todayStr],
  );
  const todaysPagination = useListPagination(todaysAppointments);

  const getStatusBadgeVariant = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "NO_SHOW":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const handleOpenDetail = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsDetailDialogOpen(true);
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateForBooking(dateStr);
    setBookingSheetOpen(true);
  };

  const handleBookSubmit = async (variables: {
    customerId: string;
    startAt: string;
    endAt: string;
    serviceIds: string[];
    assignedEmployeeIds: string[];
  }) => {
    await createAppointment({ variables });
    await refetch();
  };

  // Appointment counts
  const totalCount = data?.appointments?.length || 0;
  const scheduledCount =
    data?.appointments?.filter((a) => a.status.toUpperCase() === "SCHEDULED").length || 0;
  const completedCount =
    data?.appointments?.filter((a) => a.status.toUpperCase() === "COMPLETED").length || 0;
  const cancelledCount =
    data?.appointments?.filter((a) => a.status.toUpperCase() === "CANCELLED").length || 0;

  return (
    <div className="space-y-6">
      {/* Top Header: Title, Controls, Quick Book */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage client appointments, staff schedule, and booking requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NewAppointmentSheet
            customers={data?.customers || []}
            services={data?.services || []}
            employees={data?.employees || []}
            defaultDate={selectedDateForBooking}
            isOpen={bookingSheetOpen}
            onOpenChange={setBookingSheetOpen}
            onSubmitAppointment={handleBookSubmit}
          />
          <Button
            variant="default"
            className="gap-1.5 shadow-xs"
            onClick={() => {
              setSelectedDateForBooking(todayStr);
              setBookingSheetOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="all" className="gap-2">
            All Bookings <Badge variant="secondary" className="px-1.5 py-0 text-xs">{totalCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="SCHEDULED" className="gap-2">
            Scheduled <Badge variant="secondary" className="px-1.5 py-0 text-xs">{scheduledCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="COMPLETED" className="gap-2">
            Completed <Badge variant="secondary" className="px-1.5 py-0 text-xs">{completedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="CANCELLED" className="gap-2">
            Cancelled <Badge variant="secondary" className="px-1.5 py-0 text-xs">{cancelledCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Action Toolbar & Search / Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card rounded-lg border shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <Select
            value={selectedEmployeeId || "all"}
            onValueChange={(val) => setSelectedEmployeeId(val ?? "all")}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Staff Member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {data?.employees?.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedServiceId || "all"}
            onValueChange={(val) => setSelectedServiceId(val ?? "all")}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {data?.services?.map((svc) => (
                <SelectItem key={svc.id} value={svc.id}>
                  {svc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar Fast-Navigation Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToFirstMonth}
            title="Beginning of Year"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToPreviousMonth}
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentMonth}
            className="gap-1 px-2.5 text-xs font-medium"
            title="Jump to Today"
          >
            <CalendarArrowDown className="h-3.5 w-3.5" />
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToNextMonth}
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToLastMonth}
            title="End of Year"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Two-Column Calendar Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left / Main Calendar Grid */}
        <div className="flex-1 w-full min-w-0">
          <Card className="shadow-xs border overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Schedule View — {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {loading ? (
                  <Skeleton className="inline-block h-3 w-32" />
                ) : (
                  `${filteredAppointments.length} appointment${filteredAppointments.length === 1 ? "" : "s"} found`
                )}
              </span>
            </CardHeader>
            <CardContent className="p-4">
              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="p-1.5 text-center font-medium text-xs text-muted-foreground uppercase tracking-wider"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 42 Calendar Cells */}
              {loading ? (
                <CalendarMonthSkeleton />
              ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((cell, idx) => {
                  const isToday = cell.dateStr === todayStr;
                  const dayAppts = appointmentsByDate.get(cell.dateStr) || [];

                  return (
                    <div
                      key={idx}
                      onClick={() => handleDayClick(cell.dateStr)}
                      className={`min-h-[105px] p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                        cell.isCurrentMonth
                          ? "bg-card hover:border-primary/50 hover:shadow-xs"
                          : "bg-muted/20 text-muted-foreground/60 border-dashed"
                      } ${isToday ? "ring-2 ring-primary/40 border-primary" : ""}`}
                    >
                      {/* Top: Day number & Add badge */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-semibold rounded-full size-6 flex items-center justify-center ${
                            isToday
                              ? "bg-primary text-primary-foreground font-bold"
                              : cell.isCurrentMonth
                              ? "text-foreground group-hover:text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {cell.day}
                        </span>
                        {dayAppts.length > 0 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {dayAppts.length}
                          </span>
                        )}
                      </div>

                      {/* Appointments on this day */}
                      <div className="space-y-1 overflow-hidden flex-1">
                        {dayAppts.slice(0, 3).map((appt) => {
                          const customer = customersMap.get(appt.customerId);
                          const service = servicesMap.get(appt.serviceIds[0]);
                          const startTimeStr = (() => {
                            try {
                              return new Date(appt.startAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            } catch {
                              return "";
                            }
                          })();

                          return (
                            <div
                              key={appt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(appt);
                              }}
                              className={`text-[11px] p-1 rounded border leading-tight truncate transition-transform hover:scale-[1.02] cursor-pointer shadow-2xs ${getStatusBadgeVariant(
                                appt.status
                              )}`}
                              title={`${customer ? `${customer.firstName} ${customer.lastName}` : "Client"} - ${service?.name || "Service"}`}
                            >
                              <div className="font-semibold truncate">
                                {startTimeStr && <span className="opacity-75 mr-1">{startTimeStr}</span>}
                                {customer ? `${customer.firstName} ${customer.lastName}` : "Client"}
                              </div>
                              {service && (
                                <div className="text-[10px] opacity-85 truncate">
                                  {service.name}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {dayAppts.length > 3 && (
                          <div className="text-[10px] text-muted-foreground font-medium pl-1">
                            +{dayAppts.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right / Side Panel: Quick Navigation (matching maintenance-test-environment) */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          {/* Quick Navigation 13-Month Button List */}
          <Card className="shadow-xs border">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Quick Navigation</span>
                <Badge variant="outline" className="text-[10px] font-normal">
                  13-Month
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[380px] overflow-y-auto">
              {quickNavigationMonths.map((monthInfo, index) => (
                <Button
                  key={index}
                  variant={monthInfo.isCurrent ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-between text-xs h-8"
                  onClick={() => goToSpecificMonth(monthInfo.year, monthInfo.month)}
                >
                  <span className="font-medium">
                    {monthInfo.name} {monthInfo.year}
                  </span>
                  {monthInfo.isCurrent && (
                    <span className="text-[10px] bg-primary-foreground/20 px-1.5 py-0.2 rounded font-semibold">
                      Current
                    </span>
                  )}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Today's Schedule Snapshot */}
          <Card className="shadow-xs border">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Today's Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded bg-muted/40 border">
                  <div className="text-lg font-bold text-foreground">
                    {appointmentsByDate.get(todayStr)?.length || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Today's Bookings</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border">
                  <div className="text-lg font-bold text-foreground">{scheduledCount}</div>
                  <div className="text-[10px] text-muted-foreground">Pending / Upc.</div>
                </div>
              </div>

              <PaginatedSection
                fill={false}
                className="pt-1"
                footer={
                  todaysAppointments.length > 0 ? (
                    <ListPagination {...todaysPagination.paginationProps} />
                  ) : null
                }
              >
                <span className="font-medium text-muted-foreground text-[11px] block">
                  Today's Appointments:
                </span>
                {todaysAppointments.length === 0 ? (
                  <p className="mt-1.5 text-muted-foreground text-[11px] italic">
                    No bookings scheduled for today.
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1.5">
                    {todaysPagination.pageItems.map((a) => {
                      const cust = customersMap.get(a.customerId);
                      const svc = servicesMap.get(a.serviceIds[0]);
                      return (
                        <div
                          key={a.id}
                          onClick={() => handleOpenDetail(a)}
                          className="p-1.5 rounded border bg-card hover:bg-muted/40 cursor-pointer flex items-center justify-between"
                        >
                          <div className="truncate">
                            <p className="font-medium truncate">
                              {cust ? `${cust.firstName} ${cust.lastName}` : "Client"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {svc?.name || "Service"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {a.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </PaginatedSection>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Appointment Details
                  </DialogTitle>
                  <Badge className={getStatusBadgeVariant(selectedAppointment.status)}>
                    {selectedAppointment.status}
                  </Badge>
                </div>
                <DialogDescription>
                  Appointment reference ID: {selectedAppointment.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-sm">
                {/* Client info */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Customer</div>
                    <div className="font-semibold text-foreground">
                      {(() => {
                        const c = customersMap.get(selectedAppointment.customerId);
                        return c ? `${c.firstName} ${c.lastName}` : selectedAppointment.customerId;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Service info */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border">
                  <Scissors className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Services Booked</div>
                    <div className="font-semibold text-foreground">
                      {selectedAppointment.serviceIds
                        .map((id) => servicesMap.get(id)?.name || id)
                        .join(", ")}
                    </div>
                  </div>
                </div>

                {/* Staff info */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Assigned Staff</div>
                    <div className="font-semibold text-foreground">
                      {selectedAppointment.assignedEmployeeIds.length > 0
                        ? selectedAppointment.assignedEmployeeIds
                            .map((id) => {
                              const e = employeesMap.get(id);
                              return e ? `${e.firstName} ${e.lastName}` : id;
                            })
                            .join(", ")
                        : "Unassigned"}
                    </div>
                  </div>
                </div>

                {/* Time info */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Scheduled Time</div>
                    <div className="font-semibold text-foreground">
                      {new Date(selectedAppointment.startAt).toLocaleString()} —{" "}
                      {new Date(selectedAppointment.endAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <div className="text-xs text-muted-foreground font-medium">Notes</div>
                    <p className="text-xs text-foreground mt-0.5">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
