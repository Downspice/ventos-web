import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { NewButton } from "@/components/FormDrawer";
import { RecordViewDrawer } from "@/components/RecordViewDrawer";
import { TableRowActions } from "@/components/TableRowActions";
import { ProductWithImage } from "@/components/EntityImageField";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import { useMemo, useRef, useState } from "react";
import { ListSearchField } from "@/components/ListSearchField";
import { MultiComboboxFilter } from "@/components/MultiComboboxFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  collectMetadataFilterOptions,
  hasActiveProductListFilters,
  metadataTagsForProductListFilter,
  productMatchesListFilters,
} from "@/utils/product-list-filters";
import { ProductStepFormDrawer } from "@/components/ProductStepFormDrawer";
import {
  ProductFormStepAttributes,
  ProductFormStepExpiryDiscounts,
  ProductFormStepGeneral,
  productFormToInput,
  type ProductDiscountType,
  type ProductFormState,
} from "@/components/product-form-steps";
import type { ProductMetadataFieldDef } from "@/components/ProductMetadataEditor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowsSkeleton } from "@/components/loading-skeletons";

const Q = gql`
  query ProductsPage {
    products {
      id
      name
      sku
      barcode
      price
      cost
      isActive
      imageUrl
      categoryId
      productTypeId
      trackInventory
      metadata
      expiryDate
      discountType
      discountValue
    }
    productCategories {
      id
      name
    }
    productTypes(includeInactive: false) {
      id
      name
    }
    productMetadataFields {
      id
      productTypeId
      key
      label
      valueType
      unit
      options
      active
    }
    discountRules {
      id
      name
      type
      value
      isActive
    }
  }
`;

const CREATE = gql`
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateProduct($id: ID!, $input: ProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
    }
  }
`;

const BARCODE = gql`
  mutation Barcode($id: ID!) {
    generateProductBarcode(id: $id) {
      id
      barcode
    }
  }
`;

const DELETE = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

type ProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  cost: number;
  isActive: boolean;
  imageUrl?: string | null;
  categoryId?: string | null;
  productTypeId?: string | null;
  trackInventory: boolean;
  metadata?: Record<string, string> | null;
  expiryDate?: string | null;
  discountType: ProductDiscountType;
  discountValue: number;
};

const emptyForm = (): ProductFormState => ({
  name: "",
  sku: "",
  barcode: "",
  price: "0",
  cost: "0",
  categoryId: "",
  productTypeId: "",
  trackInventory: true,
  imageUrl: "",
  metadata: {},
  expiryDate: "",
  discountType: "NONE",
  discountValue: "",
});

function discountLabel(
  type: ProductDiscountType,
  value: number,
  formatMoney: (n: number) => string,
): string {
  if (type === "NONE" || !value) return "—";
  if (type === "PERCENT") return `${value}% off`;
  return `${formatMoney(value)} off`;
}

export default function ProductsPage() {
  const { formatMoney } = useBusinessCurrency();
  const { data, loading, refetch } = useQuery<{
    products?: ProductRow[];
    productCategories?: { id: string; name: string }[];
    productTypes?: { id: string; name: string }[];
    productMetadataFields?: ProductMetadataFieldDef[];
    discountRules?: { id: string; name: string; type: string; value: number; isActive: boolean }[];
  }>(Q, { fetchPolicy: "cache-and-network" });
  const [createProduct] = useMutation(CREATE);
  const [updateProduct] = useMutation(UPDATE);
  const [genBarcode] = useMutation(BARCODE);
  const [deleteProduct] = useMutation(DELETE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [viewProduct, setViewProduct] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formStep, setFormStep] = useState(0);
  const [search, setSearch] = useState("");
  const [filterTypeIds, setFilterTypeIds] = useState<string[]>([]);
  const [filterMetadataValues, setFilterMetadataValues] = useState<string[]>([]);
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");

  const allMetadataFields = (data?.productMetadataFields ?? []).filter((f) => f.active !== false);
  const activeProductTypes = data?.productTypes ?? [];
  const typeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of activeProductTypes) map.set(t.id, t.name);
    return map;
  }, [activeProductTypes]);
  const metadataFields = allMetadataFields.filter(
    (f) => !form.productTypeId || f.productTypeId === form.productTypeId,
  );
  const productList = data?.products ?? [];
  const filterState = useMemo(
    () => ({
      search,
      typeIds: filterTypeIds,
      metadataValues: filterMetadataValues,
      minPrice: filterMinPrice,
      maxPrice: filterMaxPrice,
    }),
    [search, filterTypeIds, filterMetadataValues, filterMinPrice, filterMaxPrice],
  );
  const metadataFilterOptions = useMemo(
    () => collectMetadataFilterOptions(productList, allMetadataFields),
    [productList, allMetadataFields],
  );
  const typeFilterOptions = useMemo(
    () => activeProductTypes.map((t) => ({ id: t.id, name: t.name })),
    [activeProductTypes],
  );
  const filtersActive = hasActiveProductListFilters(filterState);
  const filteredProducts = useMemo(() => {
    const ctx = { typeNameById, allMetadataFields };
    return productList.filter((p) => productMatchesListFilters(p, filterState, ctx));
  }, [productList, filterState, typeNameById, allMetadataFields]);

  function clearListFilters() {
    setSearch("");
    setFilterTypeIds([]);
    setFilterMetadataValues([]);
    setFilterMinPrice("");
    setFilterMaxPrice("");
  }
  const productsPagination = useListPagination(filteredProducts);
  const activeDiscountRules = (data?.discountRules ?? []).filter((d) => d.isActive);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const barcodeFormActive = drawerOpen || editProduct != null;

  function closeForm() {
    setDrawerOpen(false);
    setEditProduct(null);
    setForm(emptyForm());
    setFormStep(0);
  }

  function openEdit(p: ProductRow) {
    setEditProduct(p);
    setFormStep(0);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      price: String(p.price),
      cost: String(p.cost),
      categoryId: p.categoryId ?? "",
      productTypeId: p.productTypeId ?? "",
      trackInventory: p.trackInventory,
      imageUrl: p.imageUrl ?? "",
      metadata: { ...(p.metadata ?? {}) },
      expiryDate: p.expiryDate ?? "",
      discountType: p.discountType ?? "NONE",
      discountValue:
        p.discountType && p.discountType !== "NONE" ? String(p.discountValue) : "",
    });
  }

  function metadataTags(p: ProductRow): string[] {
    return metadataTagsForProductListFilter(p, allMetadataFields);
  }

  function metadataSummary(p: ProductRow) {
    const tags = metadataTags(p);
    return tags.length > 0 ? tags.join(" · ") : "";
  }

  function canAdvanceFromStep(step: number) {
    if (step === 0) {
      const typeOk =
        activeProductTypes.length === 0 || form.productTypeId.trim().length > 0;
      return typeOk && form.name.trim().length > 0 && Number(form.price) >= 0;
    }
    if (step === 1) return true;
    if (form.discountType === "PERCENT") {
      const v = Number(form.discountValue);
      return form.discountValue === "" || (v >= 0 && v <= 100);
    }
    return true;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (formStep < 2 || !canAdvanceFromStep(2)) return;
    await createProduct({ variables: { input: productFormToInput(form) } });
    closeForm();
    await refetch();
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editProduct || formStep < 2 || !canAdvanceFromStep(2)) return;
    await updateProduct({
      variables: { id: editProduct.id, input: productFormToInput(form) },
    });
    closeForm();
    await refetch();
  }

  const stepContent =
    formStep === 0 ? (
      <ProductFormStepGeneral
        form={form}
        setForm={setForm}
        categories={data?.productCategories ?? []}
        productTypes={activeProductTypes}
        barcodeFormActive={barcodeFormActive}
        nameInputRef={nameInputRef}
        editProductId={editProduct?.id}
        onGenerateBarcode={
          editProduct
            ? () =>
                void genBarcode({ variables: { id: editProduct.id } }).then((res) => {
                  const code = (res.data as { generateProductBarcode?: { barcode?: string } })
                    ?.generateProductBarcode?.barcode;
                  if (code) setForm((f) => ({ ...f, barcode: code }));
                })
            : undefined
        }
      />
    ) : formStep === 1 ? (
      <ProductFormStepAttributes
        form={form}
        setForm={setForm}
        fields={metadataFields}
        loading={loading && !data?.productMetadataFields}
      />
    ) : (
      <ProductFormStepExpiryDiscounts
        form={form}
        setForm={setForm}
        storeDiscountRules={activeDiscountRules}
      />
    );

  return (
    <div>
      <PageHeader
        title="Products"
        description="Catalog, SKUs, and barcodes."
        actions={
          <NewButton
            label="New product"
            onClick={() => {
              setForm(emptyForm());
              setFormStep(0);
              setDrawerOpen(true);
            }}
          />
        }
      />
      <ProductStepFormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setDrawerOpen(true);
        }}
        title="New product"
        description="Step 1 of 3 — general catalog information."
        submitLabel="Create product"
        onSubmit={onCreate}
        step={formStep}
        onStepChange={setFormStep}
        canAdvanceFromStep={canAdvanceFromStep}
      >
        {stepContent}
      </ProductStepFormDrawer>
      <ProductStepFormDrawer
        open={editProduct != null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title="Edit product"
        description="Update catalog details in three steps."
        submitLabel="Save changes"
        onSubmit={onUpdate}
        step={formStep}
        onStepChange={setFormStep}
        canAdvanceFromStep={canAdvanceFromStep}
      >
        {stepContent}
      </ProductStepFormDrawer>
      <RecordViewDrawer
        open={viewProduct != null}
        onOpenChange={(open) => {
          if (!open) setViewProduct(null);
        }}
        title="Product"
        description="Catalog item details."
        imageUrl={viewProduct?.imageUrl}
        imageAlt={viewProduct?.name ?? "Product"}
        fields={
          viewProduct
            ? [
                { label: "Name", value: viewProduct.name },
                { label: "SKU", value: viewProduct.sku ?? "" },
                { label: "Barcode", value: viewProduct.barcode ?? "" },
                { label: "Price", value: formatMoney(viewProduct.price) },
                { label: "Cost", value: formatMoney(viewProduct.cost) },
                {
                  label: "Track inventory",
                  value: viewProduct.trackInventory ? "Yes" : "No",
                },
                {
                  label: "Attributes",
                  value: metadataSummary(viewProduct) || "—",
                },
                {
                  label: "Expiry date",
                  value: viewProduct.expiryDate
                    ? new Date(viewProduct.expiryDate + "T12:00:00").toLocaleDateString()
                    : "—",
                },
                {
                  label: "Product discount",
                  value: discountLabel(
                    viewProduct.discountType,
                    viewProduct.discountValue,
                    formatMoney,
                  ),
                },
              ]
            : []
        }
      />
      <PaginatedSection
        fill="page"
        footer={
          !loading ? <ListPagination {...productsPagination.paginationProps} /> : null
        }
      >
      <div className="mb-3 flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-end gap-3">
          <ListSearchField
            className="min-w-[14rem] flex-1"
            value={search}
            onChange={setSearch}
            placeholder="Search name, SKU, barcode, type, attributes…"
          />
          <MultiComboboxFilter
            label="Type"
            options={typeFilterOptions}
            value={filterTypeIds}
            onChange={setFilterTypeIds}
            placeholder="All types"
            className="w-44"
            disabled={typeFilterOptions.length === 0}
          />
          <MultiComboboxFilter
            label="Metadata"
            options={metadataFilterOptions}
            value={filterMetadataValues}
            onChange={setFilterMetadataValues}
            placeholder="All attributes"
            className="w-48"
            disabled={metadataFilterOptions.length === 0}
          />
          <div className="flex min-w-[9rem] flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Min price</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              className="h-9"
              placeholder="Any"
              value={filterMinPrice}
              onChange={(e) => setFilterMinPrice(e.target.value)}
            />
          </div>
          <div className="flex min-w-[9rem] flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Max price</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              className="h-9"
              placeholder="Any"
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(e.target.value)}
            />
          </div>
          {filtersActive ? (
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={clearListFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
        {filtersActive ? (
          <span className="text-xs text-muted-foreground">
            {filteredProducts.length} of {productList.length} products
          </span>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead className="min-w-[12rem]">Metadata</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRowsSkeleton rows={6} cols={6} />
          ) : filteredProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                {filtersActive ? "No products match your filters." : "No products yet."}
              </TableCell>
            </TableRow>
          ) : (
            productsPagination.pageItems.map((p) => {
              const tags = metadataTags(p);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <ProductWithImage name={p.name} imageUrl={p.imageUrl} subtitle={p.sku ?? undefined} />
                  </TableCell>
                  <TableCell>{p.sku ?? "—"}</TableCell>
                  <TableCell>{p.barcode ?? "—"}</TableCell>
                  <TableCell>
                    {tags.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex max-w-md flex-wrap gap-1">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(p.price)}</TableCell>
                  <TableCell className="text-right">
                    <TableRowActions
                      onView={() => setViewProduct(p)}
                      onEdit={() => openEdit(p)}
                      onDelete={() =>
                        void deleteProduct({ variables: { id: p.id } }).then(() => refetch())
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </PaginatedSection>
    </div>
  );
}
