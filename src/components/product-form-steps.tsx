import type { RefObject } from "react";
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
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { EntityImageField } from "@/components/EntityImageField";
import { MoneyInput } from "@/components/money-input";
import {
  ProductMetadataEditor,
  type ProductMetadataFieldDef,
} from "@/components/ProductMetadataEditor";
import { normalizeScannedBarcode } from "@/lib/barcode";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";

export type ProductDiscountType = "NONE" | "PERCENT" | "FIXED";

export type ProductFormState = {
  name: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  categoryId: string;
  productTypeId: string;
  trackInventory: boolean;
  imageUrl: string;
  metadata: Record<string, string>;
  expiryDate: string;
  discountType: ProductDiscountType;
  discountValue: string;
};

type StepProps = {
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
};

type GeneralStepProps = StepProps & {
  categories: { id: string; name: string }[];
  productTypes: { id: string; name: string }[];
  barcodeFormActive: boolean;
  nameInputRef: RefObject<HTMLInputElement | null>;
  editProductId?: string;
  onGenerateBarcode?: () => void;
  onProductTypeChange?: (productTypeId: string) => void;
};

export function ProductFormStepGeneral({
  form,
  setForm,
  categories,
  productTypes,
  barcodeFormActive,
  nameInputRef,
  editProductId,
  onGenerateBarcode,
  onProductTypeChange,
}: GeneralStepProps) {
  return (
    <>
      {productTypes.length > 0 ? (
        <div className="grid gap-1">
          <Label>Product type</Label>
          <Select
            value={form.productTypeId || null}
            onValueChange={(value) => {
              const productTypeId = value ?? "";
              setForm((f) => ({ ...f, productTypeId, metadata: {} }));
              onProductTypeChange?.(productTypeId);
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Select type…" />
            </SelectTrigger>
            <SelectContent>
              {productTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Step 2 attributes follow fields defined for this type.
          </p>
        </div>
      ) : null}
      <div className="grid gap-1">
        <Label htmlFor="pbarcode">UPC / barcode</Label>
        <BarcodeScanInput
          id="pbarcode"
          focusWhen={barcodeFormActive}
          value={form.barcode}
          onChange={(e) =>
            setForm((f) => ({ ...f, barcode: normalizeScannedBarcode(e.target.value) }))
          }
          onScan={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            nameInputRef.current?.focus();
          }}
          placeholder="Scan with barcode scanner"
        />
        <p className="text-xs text-muted-foreground">
          USB scanners type the UPC and send Enter. Enter moves to the name field.
        </p>
        {editProductId && !form.barcode && onGenerateBarcode ? (
          <Button
            type="button"
            variant="link"
            className="h-auto justify-start px-0 text-xs"
            onClick={onGenerateBarcode}
          >
            Generate barcode automatically
          </Button>
        ) : null}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="pname">Name</Label>
        <Input
          ref={nameInputRef}
          id="pname"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="psku">SKU</Label>
        <Input
          id="psku"
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <EntityImageField
        value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
        libraryEntityType="PRODUCT"
      />
      {categories.length > 0 ? (
        <div className="grid gap-1">
          <Label>Category</Label>
          <Select
            value={form.categoryId || null}
            onValueChange={(value) => setForm((f) => ({ ...f, categoryId: value ?? "" }))}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="grid gap-1">
        <Label htmlFor="pprice">Price</Label>
        <MoneyInput
          id="pprice"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="pcost">Cost</Label>
        <MoneyInput
          id="pcost"
          value={form.cost}
          onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.trackInventory}
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, trackInventory: checked === true }))
          }
        />
        Track inventory for this product
      </label>
    </>
  );
}

export function ProductFormStepAttributes({
  form,
  setForm,
  fields,
  loading,
}: StepProps & {
  fields: ProductMetadataFieldDef[];
  loading: boolean;
}) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Optional attributes for the selected product type. Configure fields under Metadata fields
        in the sidebar.
      </p>
      <ProductMetadataEditor
        fields={fields}
        values={form.metadata}
        onChange={(metadata) => setForm((f) => ({ ...f, metadata }))}
        loading={loading}
      />
    </>
  );
}

export function ProductFormStepExpiryDiscounts({
  form,
  setForm,
  storeDiscountRules,
}: StepProps & {
  storeDiscountRules?: { name: string; type: string; value: number }[];
}) {
  const { formatMoney } = useBusinessCurrency();

  return (
    <>
      <div className="grid gap-1">
        <Label htmlFor="pexpiry">Expiry date</Label>
        <Input
          id="pexpiry"
          type="date"
          value={form.expiryDate}
          onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">Leave empty if this product does not expire.</p>
      </div>
      <div className="grid gap-1">
        <Label>Default discount for this product</Label>
        <Select
          value={form.discountType}
          onValueChange={(value) =>
            setForm((f) => ({
              ...f,
              discountType: value as ProductDiscountType,
              discountValue: value === "NONE" ? "" : f.discountValue,
            }))
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">No product discount</SelectItem>
            <SelectItem value="PERCENT">Percent off price</SelectItem>
            <SelectItem value="FIXED">Fixed amount off</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.discountType === "PERCENT" ? (
        <div className="grid gap-1">
          <Label htmlFor="pdiscpct">Discount percent</Label>
          <Input
            id="pdiscpct"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.discountValue}
            onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
            placeholder="e.g. 10"
          />
        </div>
      ) : null}
      {form.discountType === "FIXED" ? (
        <div className="grid gap-1">
          <Label htmlFor="pdiscfixed">Amount off</Label>
          <MoneyInput
            id="pdiscfixed"
            value={form.discountValue}
            onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
          />
        </div>
      ) : null}
      {(storeDiscountRules?.length ?? 0) > 0 ? (
        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Store-wide discount rules</p>
          <ul className="list-inside list-disc space-y-0.5">
            {storeDiscountRules!.map((d) => (
              <li key={d.name}>
                {d.name}:{" "}
                {d.type === "PERCENT" ? `${d.value}%` : formatMoney(d.value)}
              </li>
            ))}
          </ul>
          <p className="mt-2">These apply at checkout in addition to any product default.</p>
        </div>
      ) : null}
    </>
  );
}

export function productFormToInput(form: ProductFormState) {
  const discountType = form.discountType;
  const discountValue =
    discountType === "NONE" ? 0 : Number(form.discountValue) || 0;
  return {
    name: form.name.trim(),
    sku: form.sku || undefined,
    barcode: form.barcode || undefined,
    price: Number(form.price) || 0,
    cost: Number(form.cost) || 0,
    categoryId: form.categoryId || undefined,
    productTypeId: form.productTypeId || undefined,
    trackInventory: form.trackInventory,
    imageUrl: form.imageUrl || undefined,
    metadata: form.metadata,
    expiryDate: form.expiryDate || undefined,
    discountType,
    discountValue: discountType === "NONE" ? undefined : discountValue,
  };
}
