import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAccess } from "@/hooks/useAccess";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { ListSearchField } from "@/components/ListSearchField";
import { matchesListSearch } from "@/utils/list-search";

const Q = gql`
  query ProductTypesPage {
    productTypes(includeInactive: true) {
      id
      name
      description
      sortOrder
      active
      createdAt
    }
  }
`;

const CREATE = gql`
  mutation CreateProductType($input: ProductTypeInput!) {
    createProductType(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateProductType($id: ID!, $input: ProductTypeUpdateInput!) {
    updateProductType(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE = gql`
  mutation DeleteProductType($id: ID!) {
    deleteProductType(id: $id)
  }
`;

const SEED = gql`
  mutation SeedProductMetadataFields {
    seedProductMetadataFields
  }
`;

type TypeRow = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

const emptyForm = () => ({
  name: "",
  description: "",
  sortOrder: "0",
  active: true,
});

export default function ProductTypesPage() {
  const { can } = useAccess();
  const canEdit = can("inventory.update");
  const { data, loading, refetch } = useQuery<{ productTypes?: TypeRow[] }>(Q);
  const [createType] = useMutation(CREATE);
  const [updateType] = useMutation(UPDATE);
  const [deleteType] = useMutation(DELETE);
  const [seedDefaults] = useMutation(SEED);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<TypeRow | null>(null);
  const [viewRow, setViewRow] = useState<TypeRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => data?.productTypes ?? [], [data]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        matchesListSearch(search, row.name, row.description, String(row.sortOrder)),
      ),
    [rows, search],
  );
  const typesPagination = useListPagination(filteredRows);

  function openCreate() {
    setEditRow(null);
    setForm(emptyForm());
    setDrawerOpen(true);
  }

  function openEdit(row: TypeRow) {
    setEditRow(row);
    setForm({
      name: row.name,
      description: row.description ?? "",
      sortOrder: String(row.sortOrder),
      active: row.active,
    });
    setDrawerOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const sortOrder = Number(form.sortOrder) || 0;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      sortOrder,
      active: form.active,
    };
    if (editRow) {
      await updateType({ variables: { id: editRow.id, input: payload } });
    } else {
      await createType({ variables: { input: payload } });
    }
    setDrawerOpen(false);
    setEditRow(null);
    setForm(emptyForm());
    await refetch();
  }

  async function onDelete(row: TypeRow) {
    if (!window.confirm(`Delete product type “${row.name}”?`)) return;
    await deleteType({ variables: { id: row.id } });
    await refetch();
  }

  const formFields = (
    <>
      <div className="grid gap-1">
        <Label htmlFor="pt-name">Name</Label>
        <Input
          id="pt-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          disabled={!canEdit}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="pt-desc">Description</Label>
        <Input
          id="pt-desc"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional"
          disabled={!canEdit}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="pt-order">Sort order</Label>
        <Input
          id="pt-order"
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          disabled={!canEdit}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="pt-active"
          checked={form.active}
          onCheckedChange={(c) => setForm((f) => ({ ...f, active: c === true }))}
          disabled={!canEdit}
        />
        <Label htmlFor="pt-active">Active (available when creating products)</Label>
      </div>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Product types"
        description="Group products (beverage, food, cosmetic, etc.) and attach metadata fields per type."
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void seedDefaults().then(() => refetch())}
              >
                Add suggested types & fields
              </Button>
              <NewButton label="New type" onClick={openCreate} />
            </div>
          ) : null
        }
      />
      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editRow ? "Edit product type" : "New product type"}
        submitLabel={editRow ? "Save" : "Create"}
        readOnly={!canEdit}
        onSubmit={canEdit ? onSave : undefined}
      >
        {formFields}
      </FormDrawer>
      <RecordViewDrawer
        open={viewRow != null}
        onOpenChange={(open) => {
          if (!open) setViewRow(null);
        }}
        title="Product type"
        fields={
          viewRow
            ? [
                { label: "Name", value: viewRow.name },
                { label: "Description", value: viewRow.description ?? "—" },
                { label: "Sort order", value: String(viewRow.sortOrder) },
                { label: "Active", value: viewRow.active ? "Yes" : "No" },
              ]
            : []
        }
      />
      <PaginatedSection
        fill="page"
        footer={
          !loading && filteredRows.length > 0 ? (
            <ListPagination {...typesPagination.paginationProps} />
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-xs">
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder="Search type name or description…"
          />
          {search.trim() ? (
            <span className="text-xs text-muted-foreground">
              {filteredRows.length} of {rows.length} types
            </span>
          ) : null}
        </div>
        {loading && !data?.productTypes ? (
          <TableRowsSkeleton cols={5} rows={6} />
        ) : filteredRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {search.trim() ? "No product types match your search." : "No product types yet."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {typesPagination.pageItems.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {row.description ?? "—"}
                  </TableCell>
                  <TableCell>{row.sortOrder}</TableCell>
                  <TableCell>{row.active ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/product-metadata?productTypeId=${row.id}`}>Fields</Link>
                      </Button>
                      <TableRowActions
                        onView={() => setViewRow(row)}
                        onEdit={canEdit ? () => openEdit(row) : undefined}
                        onDelete={canEdit ? () => void onDelete(row) : undefined}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PaginatedSection>
    </div>
  );
}
