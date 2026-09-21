import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { useAccess } from "@/hooks/useAccess";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/components/loading-skeletons";
import { TableRowActions } from "@/components/TableRowActions";
import { SaleViewDrawer } from "@/components/sales/SaleViewDrawer";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";

const POS_SALES = gql`
  query PosSalesList($status: String) {
    sales(status: $status) {
      id
      status
      total
      customerId
      employeeId
      createdAt
    }
    customers {
      id
      firstName
      lastName
    }
  }
`;

const POS_SALES_EMPLOYEES = gql`
  query PosSalesEmployees {
    employees {
      id
      firstName
      lastName
    }
  }
`;

type StatusFilter = "ALL" | "FINALIZED" | "DRAFT" | "VOID";

function statusBadgeVariant(status: string): "secondary" | "outline" | "destructive" {
  if (status === "FINALIZED") return "secondary";
  if (status === "VOID") return "destructive";
  return "outline";
}

type Props = {
  /** Increment to refetch after a new sale is completed. */
  refreshKey?: number;
};

export function PosSalesList({ refreshKey = 0 }: Props) {
  const { formatMoney } = useBusinessCurrency();
  const { can } = useAccess();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [viewSaleId, setViewSaleId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{
    sales?: {
      id: string;
      status: string;
      total: number;
      customerId?: string | null;
      employeeId?: string | null;
      createdAt: string;
    }[];
    customers?: { id: string; firstName: string; lastName: string }[];
  }>(POS_SALES, {
    variables: { status: statusFilter === "ALL" ? null : statusFilter },
  });

  const { data: employeesData } = useQuery<{
    employees?: { id: string; firstName: string; lastName: string }[];
  }>(POS_SALES_EMPLOYEES, {
    skip: !can("employees.read"),
  });

  useEffect(() => {
    if (refreshKey > 0) void refetch();
  }, [refreshKey, refetch]);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.customers ?? []) {
      map.set(c.id, `${c.firstName} ${c.lastName}`.trim());
    }
    return map;
  }, [data?.customers]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employeesData?.employees ?? []) {
      map.set(e.id, `${e.firstName} ${e.lastName}`.trim());
    }
    return map;
  }, [employeesData?.employees]);

  const salesPagination = useListPagination(data?.sales ?? [], 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent sales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <SaleViewDrawer
          saleId={viewSaleId}
          customerNameById={customerNameById}
          open={viewSaleId != null}
          onOpenChange={(open) => {
            if (!open) setViewSaleId(null);
          }}
        />

        <div className="grid max-w-xs gap-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "ALL")}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="FINALIZED">Finalized</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PaginatedSection
          footer={
            !loading && (data?.sales ?? []).length > 0 ? (
              <ListPagination {...salesPagination.paginationProps} />
            ) : null
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sale</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Sold by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsSkeleton rows={5} cols={7} />
              ) : (data?.sales ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No sales yet. Complete an order to see it here.
                  </TableCell>
                </TableRow>
              ) : (
                salesPagination.pageItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(s.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.id.slice(-8)}</TableCell>
                    <TableCell className="text-sm">
                      {s.customerId
                        ? customerNameById.get(s.customerId) ?? "—"
                        : "Walk-in"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.employeeId ? employeeNameById.get(s.employeeId) ?? "—" : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatMoney(s.total)}
                    </TableCell>
                    <TableCell>
                      <TableRowActions onView={() => setViewSaleId(s.id)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </PaginatedSection>
      </CardContent>
    </Card>
  );
}
