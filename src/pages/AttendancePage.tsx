import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowsSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/PageHeader";
import { RecordViewDrawer, type RecordViewField } from "@/components/RecordViewDrawer";
import { TableRowActions } from "@/components/TableRowActions";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import { useState } from "react";

const Q = gql`
  query AttendancePage {
    attendanceRecords {
      id
      employeeId
      clockInAt
      clockOutAt
    }
    shifts {
      id
      employeeId
      startAt
      endAt
    }
    performanceMetrics {
      id
      employeeId
      salesTotal
      appointmentCount
      periodStart
      periodEnd
    }
  }
`;

const CLOCK_IN = gql`
  mutation ClockIn {
    clockIn {
      id
      clockInAt
    }
  }
`;

const CLOCK_OUT = gql`
  mutation ClockOut {
    clockOut {
      id
      clockOutAt
    }
  }
`;

export default function AttendancePage() {
  const { formatMoney } = useBusinessCurrency();
  const { data, loading, refetch } = useQuery<{
    attendanceRecords?: {
      id: string;
      employeeId: string;
      clockInAt: string;
      clockOutAt?: string;
    }[];
    shifts?: { id: string; employeeId: string; startAt: string; endAt: string }[];
    performanceMetrics?: {
      id: string;
      employeeId: string;
      salesTotal: number;
      appointmentCount: number;
      periodStart: string;
      periodEnd: string;
    }[];
  }>(Q);
  const [clockIn] = useMutation(CLOCK_IN);
  const [clockOut] = useMutation(CLOCK_OUT);
  const [viewSheet, setViewSheet] = useState<{ title: string; fields: RecordViewField[] } | null>(
    null,
  );

  const attendancePagination = useListPagination(data?.attendanceRecords ?? []);
  const shiftsPagination = useListPagination(data?.shifts ?? []);
  const metricsPagination = useListPagination(data?.performanceMetrics ?? []);

  return (
    <div>
      <PageHeader
        title="Attendance & shifts"
        description="Clock in/out, scheduled shifts, and performance snapshots."
        actions={
          <>
            <Button variant="outline" onClick={() => void clockIn().then(() => refetch())}>
              Clock in
            </Button>
            <Button onClick={() => void clockOut().then(() => refetch())}>Clock out</Button>
          </>
        }
      />
      <RecordViewDrawer
        open={viewSheet != null}
        onOpenChange={(open) => {
          if (!open) setViewSheet(null);
        }}
        title={viewSheet?.title ?? "Record"}
        fields={viewSheet?.fields ?? []}
      />
      <div className="grid gap-6">
        <Card>
          <CardContent className="flex flex-col pt-6">
            <PaginatedSection
              fill
              footer={
                !loading ? <ListPagination {...attendancePagination.paginationProps} /> : null
              }
            >
            <h3 className="mb-3 text-sm font-medium">Recent attendance</h3>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clock in</TableHead>
                    <TableHead>Clock out</TableHead>
                    <TableHead className="w-[1%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRowsSkeleton rows={5} cols={3} />
                  ) : (
                    attendancePagination.pageItems.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.clockInAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {a.clockOutAt ? new Date(a.clockOutAt).toLocaleString() : "Open"}
                      </TableCell>
                      <TableCell>
                        <TableRowActions
                          onView={() =>
                            setViewSheet({
                              title: "Attendance",
                              fields: [
                                { label: "Employee ID", value: a.employeeId },
                                {
                                  label: "Clock in",
                                  value: new Date(a.clockInAt).toLocaleString(),
                                },
                                {
                                  label: "Clock out",
                                  value: a.clockOutAt
                                    ? new Date(a.clockOutAt).toLocaleString()
                                    : "Open",
                                },
                              ],
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </PaginatedSection>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col pt-6">
            <PaginatedSection
              fill
              footer={
                !loading ? <ListPagination {...shiftsPagination.paginationProps} /> : null
              }
            >
            <h3 className="mb-3 text-sm font-medium">Shifts</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRowsSkeleton rows={4} cols={3} />
                ) : (
                  shiftsPagination.pageItems.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{new Date(s.startAt).toLocaleString()}</TableCell>
                      <TableCell>{new Date(s.endAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <TableRowActions
                          onView={() =>
                            setViewSheet({
                              title: "Shift",
                              fields: [
                                { label: "Employee ID", value: s.employeeId },
                                { label: "Start", value: new Date(s.startAt).toLocaleString() },
                                { label: "End", value: new Date(s.endAt).toLocaleString() },
                              ],
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </PaginatedSection>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col pt-6">
            <PaginatedSection
              fill
              footer={
                !loading ? <ListPagination {...metricsPagination.paginationProps} /> : null
              }
            >
            <h3 className="mb-3 text-sm font-medium">Performance metrics</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Appointments</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRowsSkeleton rows={4} cols={4} />
                ) : (
                  metricsPagination.pageItems.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {new Date(m.periodStart).toLocaleDateString()} –{" "}
                      {new Date(m.periodEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(m.salesTotal)}</TableCell>
                    <TableCell className="text-right">{m.appointmentCount}</TableCell>
                    <TableCell>
                      <TableRowActions
                        onView={() =>
                          setViewSheet({
                            title: "Performance metric",
                            fields: [
                              { label: "Employee ID", value: m.employeeId },
                              {
                                label: "Period start",
                                value: new Date(m.periodStart).toLocaleDateString(),
                              },
                              {
                                label: "Period end",
                                value: new Date(m.periodEnd).toLocaleDateString(),
                              },
                              { label: "Sales total", value: formatMoney(m.salesTotal) },
                              {
                                label: "Appointments",
                                value: String(m.appointmentCount),
                              },
                            ],
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </PaginatedSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
