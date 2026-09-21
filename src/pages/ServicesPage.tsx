import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EntityImageField, EntityImageThumb } from "@/components/EntityImageField";
import { MoneyInput } from "@/components/money-input";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import { useState } from "react";

const Q = gql`
  query ServicesPage {
    services {
      id
      name
      description
      durationMinutes
      price
      isActive
      imageUrl
    }
    staffServiceAssignments {
      id
      employeeId
      serviceId
    }
    employees {
      id
      firstName
      lastName
    }
  }
`;

const CREATE = gql`
  mutation CreateService($input: ServiceInput!) {
    createService(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateService($id: ID!, $input: ServiceInput!) {
    updateService(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE = gql`
  mutation DeleteService($id: ID!) {
    deleteService(id: $id)
  }
`;

type ServiceRow = {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  imageUrl?: string | null;
};

const emptyForm = () => ({
  name: "",
  description: "",
  duration: "60",
  price: "0",
  imageUrl: "",
});

export default function ServicesPage() {
  const { formatMoney } = useBusinessCurrency();
  const { data, loading, refetch } = useQuery<{
    services?: ServiceRow[];
    staffServiceAssignments?: { id: string; employeeId: string; serviceId: string }[];
    employees?: { id: string; firstName: string; lastName: string }[];
  }>(Q);
  const [createService] = useMutation(CREATE);
  const [updateService] = useMutation(UPDATE);
  const [deleteService] = useMutation(DELETE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editService, setEditService] = useState<ServiceRow | null>(null);
  const [viewService, setViewService] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const servicesPagination = useListPagination(data?.services ?? []);
  const assignmentsPagination = useListPagination(data?.staffServiceAssignments ?? []);

  const employeeName = (id: string) => {
    const e = data?.employees?.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id.slice(-6);
  };
  const serviceName = (id: string) => data?.services?.find((s) => s.id === id)?.name ?? id.slice(-6);

  function openEdit(s: ServiceRow) {
    setEditService(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      duration: String(s.durationMinutes),
      price: String(s.price),
      imageUrl: s.imageUrl ?? "",
    });
  }

  function serviceInput() {
    return {
      name: form.name,
      durationMinutes: Number(form.duration),
      price: Number(form.price),
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
    };
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await createService({ variables: { input: serviceInput() } });
    setForm(emptyForm());
    setDrawerOpen(false);
    await refetch();
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editService) return;
    await updateService({ variables: { id: editService.id, input: serviceInput() } });
    setEditService(null);
    setForm(emptyForm());
    await refetch();
  }

  const formFields = (
    <>
      <EntityImageField
        value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
        libraryEntityType="SERVICE"
      />
      <div className="grid gap-1">
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="grid gap-1">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          placeholder="Optional"
        />
      </div>
      <div className="grid gap-1">
        <Label>Duration (minutes)</Label>
        <Input
          type="number"
          min={1}
          value={form.duration}
          onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label>Price</Label>
        <MoneyInput
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          required
        />
      </div>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Services"
        description="Service catalog and staff assignments (beauty)."
        actions={<NewButton label="New service" onClick={() => setDrawerOpen(true)} />}
      />
      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setForm(emptyForm());
        }}
        title="New service"
        description="Add a bookable service to your catalog."
        submitLabel="Create service"
        onSubmit={onCreate}
      >
        {formFields}
      </FormDrawer>
      <FormDrawer
        open={editService != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditService(null);
            setForm(emptyForm());
          }
        }}
        title="Edit service"
        description="Update service details and image."
        submitLabel="Save changes"
        onSubmit={onUpdate}
      >
        {formFields}
      </FormDrawer>
      <RecordViewDrawer
        open={viewService != null}
        onOpenChange={(open) => {
          if (!open) setViewService(null);
        }}
        title="Service"
        fields={
          viewService
            ? [
                { label: "Name", value: viewService.name },
                { label: "Description", value: viewService.description ?? "" },
                { label: "Duration", value: `${viewService.durationMinutes} min` },
                { label: "Price", value: formatMoney(viewService.price) },
              ]
            : []
        }
      />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <PaginatedSection
          footer={
            !loading ? <ListPagination {...servicesPagination.paginationProps} /> : null
          }
        >
          <h3 className="mb-2 text-sm font-medium">Services</h3>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRowsSkeleton rows={5} cols={5} />
                ) : (
                  servicesPagination.pageItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <EntityImageThumb url={s.imageUrl} name={s.name} />
                    </TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.durationMinutes} min</TableCell>
                    <TableCell className="text-right">{formatMoney(s.price)}</TableCell>
                    <TableCell className="text-right">
                      <TableRowActions
                        onView={() => setViewService(s)}
                        onEdit={() => openEdit(s)}
                        onDelete={() =>
                          void deleteService({ variables: { id: s.id } }).then(() => refetch())
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
          footer={
            !loading ? <ListPagination {...assignmentsPagination.paginationProps} /> : null
          }
        >
          <h3 className="mb-2 text-sm font-medium">Staff ↔ service assignments</h3>
          <ul className="grid gap-2 text-sm">
            {assignmentsPagination.pageItems.map((a) => (
              <li key={a.id} className="rounded border px-3 py-2">
                {employeeName(a.employeeId)} → {serviceName(a.serviceId)}
              </li>
            ))}
          </ul>
        </PaginatedSection>
      </div>
    </div>
  );
}
