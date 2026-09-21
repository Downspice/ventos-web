import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FormDrawer, NewButton } from "@/components/FormDrawer";
import { RecordViewDrawer } from "@/components/RecordViewDrawer";
import { TableRowActions } from "@/components/TableRowActions";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import { useMemo, useState } from "react";
import { SaleViewDrawer } from "@/components/sales/SaleViewDrawer";

const Q = gql`
  query CustomersPage {
    customers {
      id
      firstName
      lastName
      email
      phone
    }
  }
`;

const CREATE = gql`
  mutation CreateCustomer($firstName: String!, $lastName: String!, $email: String, $phone: String) {
    createCustomer(firstName: $firstName, lastName: $lastName, email: $email, phone: $phone) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateCustomer($id: ID!, $input: CustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id)
  }
`;

const HISTORY = gql`
  query CustomerHistory($customerId: ID!) {
    customerPurchaseHistory(customerId: $customerId) {
      id
      total
      status
      createdAt
    }
  }
`;

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

const emptyForm = () => ({ firstName: "", lastName: "", email: "", phone: "" });

export default function CustomersPage() {
  const { formatMoney } = useBusinessCurrency();
  const { data, loading, refetch } = useQuery<{ customers?: CustomerRow[] }>(Q);
  const [createCustomer] = useMutation(CREATE);
  const [updateCustomer] = useMutation(UPDATE);
  const [deleteCustomer] = useMutation(DELETE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [viewCustomer, setViewCustomer] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewSaleId, setViewSaleId] = useState<string | null>(null);
  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.customers ?? []) {
      map.set(c.id, `${c.firstName} ${c.lastName}`.trim());
    }
    return map;
  }, [data?.customers]);
  const { data: historyData } = useQuery<{
    customerPurchaseHistory?: { id: string; total: number; status: string; createdAt: string }[];
  }>(HISTORY, { variables: { customerId: selectedId ?? "" }, skip: !selectedId });

  const customersPagination = useListPagination(data?.customers ?? []);
  const historyPagination = useListPagination(historyData?.customerPurchaseHistory ?? []);

  function customerInput() {
    return {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined,
      phone: form.phone || undefined,
    };
  }

  function openEdit(c: CustomerRow) {
    setEditCustomer(c);
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? "",
      phone: c.phone ?? "",
    });
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await createCustomer({ variables: customerInput() });
    setForm(emptyForm());
    setDrawerOpen(false);
    await refetch();
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editCustomer) return;
    await updateCustomer({
      variables: { id: editCustomer.id, input: customerInput() },
    });
    setEditCustomer(null);
    setForm(emptyForm());
    await refetch();
  }

  const formFields = (
    <>
      <div className="grid gap-1">
        <Label>First name</Label>
        <Input
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label>Last name</Label>
        <Input
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div className="grid gap-1">
        <Label>Phone</Label>
        <Input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
      </div>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        description="CRM and purchase history."
        actions={<NewButton label="New customer" onClick={() => setDrawerOpen(true)} />}
      />
      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setForm(emptyForm());
        }}
        title="New customer"
        description="Add a customer to your CRM."
        submitLabel="Create customer"
        onSubmit={onCreate}
      >
        {formFields}
      </FormDrawer>
      <FormDrawer
        open={editCustomer != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditCustomer(null);
            setForm(emptyForm());
          }
        }}
        title="Edit customer"
        submitLabel="Save changes"
        onSubmit={onUpdate}
      >
        {formFields}
      </FormDrawer>
      <SaleViewDrawer
        saleId={viewSaleId}
        customerNameById={customerNameById}
        open={viewSaleId != null}
        onOpenChange={(open) => {
          if (!open) setViewSaleId(null);
        }}
      />
      <RecordViewDrawer
        open={viewCustomer != null}
        onOpenChange={(open) => {
          if (!open) setViewCustomer(null);
        }}
        title="Customer"
        fields={
          viewCustomer
            ? [
                { label: "Name", value: `${viewCustomer.firstName} ${viewCustomer.lastName}` },
                { label: "Email", value: viewCustomer.email ?? "" },
                { label: "Phone", value: viewCustomer.phone ?? "" },
              ]
            : []
        }
      />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <PaginatedSection
          className="min-w-0"
          footer={
            !loading ? <ListPagination {...customersPagination.paginationProps} /> : null
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsSkeleton rows={5} cols={3} />
              ) : (
                customersPagination.pageItems.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    data-state={selectedId === c.id ? "selected" : undefined}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell>
                      {c.firstName} {c.lastName}
                    </TableCell>
                    <TableCell>
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TableRowActions
                        onView={() => setViewCustomer(c)}
                        onEdit={() => openEdit(c)}
                        onDelete={() =>
                          void deleteCustomer({ variables: { id: c.id } }).then(() => {
                            if (selectedId === c.id) setSelectedId(null);
                            return refetch();
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
        <PaginatedSection
          className="min-w-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-6rem)]"
          footer={
            selectedId && (historyData?.customerPurchaseHistory?.length ?? 0) > 0 ? (
              <ListPagination {...historyPagination.paginationProps} />
            ) : null
          }
        >
          <h3 className="mb-2 text-sm font-medium">Purchase history</h3>
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">Select a customer to view history.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {historyPagination.pageItems.map((s) => (
                <li key={s.id} className="border-b py-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left text-sm hover:text-primary"
                    onClick={() => setViewSaleId(s.id)}
                  >
                    <span>
                      {s.status} · {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                    <span className="tabular-nums">{formatMoney(s.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PaginatedSection>
      </div>
    </div>
  );
}
