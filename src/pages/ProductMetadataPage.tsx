import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ListSearchField } from "@/components/ListSearchField";
import { matchesListSearch } from "@/utils/list-search";

const Q = gql`
  query ProductMetadataPage($productTypeId: ID) {
    productTypes(includeInactive: true) {
      id
      name
    }
    productMetadataFields(includeInactive: true, productTypeId: $productTypeId) {
      id
      productTypeId
      key
      label
      valueType
      unit
      options
      sortOrder
      active
    }
  }
`;

const CREATE = gql`
  mutation CreateProductMetadataField($input: ProductMetadataFieldInput!) {
    createProductMetadataField(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateProductMetadataField($id: ID!, $input: ProductMetadataFieldUpdateInput!) {
    updateProductMetadataField(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE = gql`
  mutation DeleteProductMetadataField($id: ID!) {
    deleteProductMetadataField(id: $id)
  }
`;

const SEED = gql`
  mutation SeedProductMetadataFields {
    seedProductMetadataFields
  }
`;

type FieldRow = {
  id: string;
  productTypeId?: string | null;
  key: string;
  label: string;
  valueType: "TEXT" | "NUMBER" | "SELECT";
  unit?: string | null;
  options: string[];
  sortOrder: number;
  active: boolean;
};

const emptyForm = (productTypeId = "") => ({
  productTypeId,
  label: "",
  valueType: "TEXT" as FieldRow["valueType"],
  unit: "",
  optionsText: "",
  sortOrder: "0",
  active: true,
});

export default function ProductMetadataPage() {
  const { can } = useAccess();
  const canEdit = can("inventory.update");
  const [searchParams, setSearchParams] = useSearchParams();
  const filterTypeId = searchParams.get("productTypeId") ?? "";
  const { data, loading, refetch } = useQuery<{
    productTypes?: { id: string; name: string }[];
    productMetadataFields?: FieldRow[];
  }>(Q, {
    variables: { productTypeId: filterTypeId || undefined },
  });
  const [createField] = useMutation(CREATE);
  const [updateField] = useMutation(UPDATE);
  const [deleteField] = useMutation(DELETE);
  const [seedFields] = useMutation(SEED);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<FieldRow | null>(null);
  const [viewRow, setViewRow] = useState<FieldRow | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [search, setSearch] = useState("");

  const typeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of data?.productTypes ?? []) map.set(t.id, t.name);
    return map;
  }, [data?.productTypes]);

  const rows = useMemo(() => data?.productMetadataFields ?? [], [data]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        matchesListSearch(
          search,
          row.label,
          row.key,
          row.valueType,
          row.unit,
          row.options.join(" "),
          row.productTypeId ? typeById.get(row.productTypeId) : undefined,
        ),
      ),
    [rows, search, typeById],
  );
  const fieldsPagination = useListPagination(filteredRows);

  function openCreate() {
    setEditRow(null);
    setForm(emptyForm(filterTypeId));
    setDrawerOpen(true);
  }

  function openEdit(row: FieldRow) {
    setEditRow(row);
    setForm({
      productTypeId: row.productTypeId ?? filterTypeId,
      label: row.label,
      valueType: row.valueType,
      unit: row.unit ?? "",
      optionsText: row.options.join(", "),
      sortOrder: String(row.sortOrder),
      active: row.active,
    });
    setDrawerOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const options =
      form.valueType === "SELECT"
        ? form.optionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    const sortOrder = Number(form.sortOrder) || 0;

    if (editRow) {
      await updateField({
        variables: {
          id: editRow.id,
          input: {
            label: form.label,
            valueType: form.valueType,
            unit: form.unit || undefined,
            options,
            sortOrder,
            active: form.active,
          },
        },
      });
    } else {
      if (!form.productTypeId) return;
      await createField({
        variables: {
          input: {
            productTypeId: form.productTypeId,
            label: form.label,
            valueType: form.valueType,
            unit: form.unit || undefined,
            options,
            sortOrder,
            active: form.active,
          },
        },
      });
    }
    setDrawerOpen(false);
    setEditRow(null);
    setForm(emptyForm(filterTypeId));
    await refetch();
  }

  const formFields = (
    <>
      {!editRow ? (
        <div className="grid gap-1">
          <Label>Product type</Label>
          <Select
            value={form.productTypeId || null}
            onValueChange={(v) => setForm((f) => ({ ...f, productTypeId: v ?? "" }))}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select type…" />
            </SelectTrigger>
            <SelectContent>
              {(data?.productTypes ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(data?.productTypes?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">
              Create a{" "}
              <Link to="/product-types" className="text-primary underline-offset-4 hover:underline">
                product type
              </Link>{" "}
              first.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-1">
        <Label htmlFor="meta-label">Label</Label>
        <Input
          id="meta-label"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          required
          disabled={!canEdit}
        />
      </div>
      <div className="grid gap-1">
        <Label>Type</Label>
        <Select
          value={form.valueType}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, valueType: (v ?? "TEXT") as FieldRow["valueType"] }))
          }
          disabled={!canEdit}
        >
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TEXT">Text</SelectItem>
            <SelectItem value="NUMBER">Number</SelectItem>
            <SelectItem value="SELECT">Dropdown</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.valueType === "NUMBER" ? (
        <div className="grid gap-1">
          <Label htmlFor="meta-unit">Unit (optional)</Label>
          <Input
            id="meta-unit"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="ml, g, L…"
            disabled={!canEdit}
          />
        </div>
      ) : null}
      {form.valueType === "SELECT" ? (
        <div className="grid gap-1">
          <Label htmlFor="meta-options">Options (comma-separated)</Label>
          <Input
            id="meta-options"
            value={form.optionsText}
            onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
            placeholder="Bottle, Can, Box"
            disabled={!canEdit}
          />
        </div>
      ) : null}
      <div className="grid gap-1">
        <Label htmlFor="meta-order">Sort order</Label>
        <Input
          id="meta-order"
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          disabled={!canEdit}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="meta-active"
          checked={form.active}
          onCheckedChange={(c) => setForm((f) => ({ ...f, active: c === true }))}
          disabled={!canEdit}
        />
        <Label htmlFor="meta-active">Active (shown on products)</Label>
      </div>
      {editRow ? (
        <p className="text-xs text-muted-foreground">
          Storage key: <code className="font-mono">{editRow.key}</code> (fixed after create)
        </p>
      ) : null}
    </>
  );

  return (
    <div>
      <PageHeader
        title="Metadata fields"
        description="Attributes per product type (size, capacity, colour, etc.) shown when creating products of that type."
        actions={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterTypeId || "all"}
                onValueChange={(v) => {
                  if (v === "all") {
                    setSearchParams({}, { replace: true });
                  } else {
                    setSearchParams({ productTypeId: v }, { replace: true });
                  }
                }}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {(data?.productTypes ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void seedFields().then(() => refetch())}
              >
                Add suggested types & fields
              </Button>
              {filterTypeId ? (
                <NewButton label="New field" onClick={openCreate} />
              ) : (
                <Button type="button" size="sm" disabled>
                  New field
                </Button>
              )}
            </div>
          ) : (
            <Select
              value={filterTypeId || "all"}
              onValueChange={(v) => {
                if (v === "all") {
                  setSearchParams({}, { replace: true });
                } else {
                  setSearchParams({ productTypeId: v }, { replace: true });
                }
              }}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Product type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {(data?.productTypes ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      <PaginatedSection
        fill="page"
        footer={
          !loading && filteredRows.length > 0 ? (
            <ListPagination {...fieldsPagination.paginationProps} />
          ) : null
        }
      >
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Search label, key, field type, unit…"
        />
        {search.trim() ? (
          <span className="text-xs text-muted-foreground">
            {filteredRows.length} of {rows.length} fields
          </span>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Product type</TableHead>
            <TableHead>Field type</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-[1%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRowsSkeleton rows={6} cols={7} />
          ) : filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                {search.trim()
                  ? "No metadata fields match your search."
                  : 'No fields for this type yet. Use "Add suggested types & fields" or create your own.'}
              </TableCell>
            </TableRow>
          ) : (
            fieldsPagination.pageItems.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.label}</TableCell>
                <TableCell>
                  <code className="text-xs">{row.key}</code>
                </TableCell>
                <TableCell>
                  {row.productTypeId ? (typeById.get(row.productTypeId) ?? "—") : "—"}
                </TableCell>
                <TableCell>{row.valueType}</TableCell>
                <TableCell>{row.unit ?? "—"}</TableCell>
                <TableCell>{row.active ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <TableRowActions
                    onView={() => setViewRow(row)}
                    onEdit={canEdit ? () => openEdit(row) : undefined}
                    onDelete={
                      canEdit
                        ? () => void deleteField({ variables: { id: row.id } }).then(() => refetch())
                        : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </PaginatedSection>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditRow(null);
        }}
        title={editRow ? "Edit metadata field" : "New metadata field"}
        description="Fields define what you can fill in on each product. Only non-empty values are stored."
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
        title="Metadata field"
        fields={
          viewRow
            ? [
                { label: "Label", value: viewRow.label },
                { label: "Key", value: viewRow.key },
                { label: "Type", value: viewRow.valueType },
                { label: "Unit", value: viewRow.unit ?? "—" },
                { label: "Options", value: viewRow.options.join(", ") || "—" },
                { label: "Sort order", value: String(viewRow.sortOrder) },
                { label: "Active", value: viewRow.active ? "Yes" : "No" },
              ]
            : []
        }
      />
    </div>
  );
}
