import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TableRowsSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/PageHeader";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import {
  ProcessReturnDialog,
  type ReturnableSale,
} from "@/components/returns/ProcessReturnDialog";

const SALES = gql`
  query ReturnsSales {
    sales(status: "FINALIZED") {
      id
      total
      createdAt
      lines {
        lineType
        productId
        name
        quantity
        unitPrice
        lineTotal
      }
    }
  }
`;

export default function ReturnsPage() {
  const { formatMoney } = useBusinessCurrency();
  const { data, loading, refetch } = useQuery<{ sales?: ReturnableSale[] }>(SALES);
  const sales = data?.sales ?? [];
  const pagination = useListPagination(sales);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSale, setActiveSale] = useState<ReturnableSale | null>(null);

  function openReturn(sale: ReturnableSale) {
    setActiveSale(sale);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Returns & refunds"
        description="Process returns against finalized sales."
      />

      <PaginatedSection
        fill="page"
        footer={
          !loading && sales.length > 0 ? (
            <ListPagination {...pagination.paginationProps} />
          ) : null
        }
      >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Sale</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[1%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRowsSkeleton rows={6} cols={5} />
          ) : sales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                No finalized sales yet.
              </TableCell>
            </TableRow>
          ) : (
            pagination.pageItems.map((sale) => {
              const itemCount = sale.lines.reduce((n, l) => n + l.quantity, 0);
              return (
                <TableRow key={sale.id}>
                  <TableCell>{new Date(sale.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{sale.id.slice(-8)}</TableCell>
                  <TableCell className="text-right tabular-nums">{itemCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(sale.total)}</TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="outline" onClick={() => openReturn(sale)}>
                      Return…
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </PaginatedSection>

      <ProcessReturnDialog
        sale={activeSale}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
