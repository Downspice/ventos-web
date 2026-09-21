import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
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
import { Badge } from "@/components/ui/badge";
import { RecordViewDrawer, type RecordViewField } from "@/components/RecordViewDrawer";
import { SaleViewDrawer } from "@/components/sales/SaleViewDrawer";
import { TableRowActions } from "@/components/TableRowActions";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import { useMemo, useState } from "react";

const Q = gql`
  query SalesPage {
    sales {
      id
      status
      total
      customerId
      createdAt
    }
    openRegisterSessions {
      id
      registerId
      openingFloat
      openedAt
    }
    discountRules {
      id
      name
      type
      value
    }
    customers {
      id
      firstName
      lastName
    }
  }
`;

export default function SalesPage() {
  const { formatMoney } = useBusinessCurrency();
  const { data, loading } = useQuery<{
    sales?: { id: string; status: string; total: number; customerId?: string; createdAt: string }[];
    openRegisterSessions?: { id: string; registerId: string; openingFloat: number; openedAt: string }[];
    discountRules?: { id: string; name: string; type: string; value: number }[];
    customers?: { id: string; firstName: string; lastName: string }[];
  }>(Q);
  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.customers ?? []) {
      map.set(c.id, `${c.firstName} ${c.lastName}`.trim());
    }
    return map;
  }, [data?.customers]);
  const [viewSheet, setViewSheet] = useState<{ title: string; fields: RecordViewField[] } | null>(
    null,
  );
  const [viewSaleId, setViewSaleId] = useState<string | null>(null);
  const sessionsPagination = useListPagination(data?.openRegisterSessions ?? []);
  const salesPagination = useListPagination(data?.sales ?? []);

  return (
    <div>
      <PageHeader title="Sales" description="Sales history, register sessions, and discount rules." />
      <RecordViewDrawer
        open={viewSheet != null}
        onOpenChange={(open) => {
          if (!open) setViewSheet(null);
        }}
        title={viewSheet?.title ?? "Record"}
        fields={viewSheet?.fields ?? []}
      />
      <SaleViewDrawer
        saleId={viewSaleId}
        customerNameById={customerNameById}
        open={viewSaleId != null}
        onOpenChange={(open) => {
          if (!open) setViewSaleId(null);
        }}
      />
      <PaginatedSection
        className="mb-8"
        fill={false}
        footer={
          !loading ? <ListPagination {...sessionsPagination.paginationProps} /> : null
        }
      >
        <h3 className="mb-2 text-sm font-medium">Open register sessions</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Register</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead className="text-right">Float</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowsSkeleton rows={4} cols={5} />
            ) : (
              sessionsPagination.pageItems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id.slice(-8)}</TableCell>
                  <TableCell>{s.registerId.slice(-8)}</TableCell>
                  <TableCell>{new Date(s.openedAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatMoney(s.openingFloat)}</TableCell>
                  <TableCell>
                    <TableRowActions
                      onView={() =>
                        setViewSheet({
                          title: "Register session",
                          fields: [
                            { label: "Session ID", value: s.id },
                            { label: "Register ID", value: s.registerId },
                            { label: "Opened", value: new Date(s.openedAt).toLocaleString() },
                            { label: "Opening float", value: formatMoney(s.openingFloat) },
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
      <section className="mb-8">
        <h3 className="mb-2 text-sm font-medium">Discount rules</h3>
        <ul className="flex flex-wrap gap-2">
          {(data?.discountRules ?? []).map((d) => (
            <li key={d.id}>
              <Badge variant="secondary">
                {d.name}: {d.type === "PERCENT" ? `${d.value}%` : formatMoney(d.value)}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
      <PaginatedSection
        fill="page"
        footer={
          !loading ? <ListPagination {...salesPagination.paginationProps} /> : null
        }
      >
        <h3 className="mb-2 text-sm font-medium">All sales</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowsSkeleton rows={6} cols={4} />
            ) : (
              salesPagination.pageItems.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{new Date(s.createdAt).toLocaleString()}</TableCell>
                <TableCell>{s.status}</TableCell>
                <TableCell className="text-right">{formatMoney(s.total)}</TableCell>
                <TableCell>
                  <TableRowActions onView={() => setViewSaleId(s.id)} />
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </PaginatedSection>
    </div>
  );
}
