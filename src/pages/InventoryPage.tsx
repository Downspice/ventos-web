import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
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
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import { PageHeader } from "@/components/PageHeader";
import { FormDrawer, NewButton } from "@/components/FormDrawer";
import { RecordViewDrawer } from "@/components/RecordViewDrawer";
import { TableRowActions } from "@/components/TableRowActions";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { findProductByBarcode, normalizeScannedBarcode } from "@/lib/barcode";
import { ProductWithImage } from "@/components/EntityImageField";

const INVENTORY = gql`
  query InventoryView {
    products {
      id
      name
      barcode
      price
      imageUrl
    }
    stockLevels {
      id
      productId
      locationId
      quantity
    }
    locations {
      id
      name
      isDefault
    }
  }
`;

const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

const ADJUST = gql`
  mutation Adjust($productId: ID!, $locationId: ID!, $quantityDelta: Float!) {
    adjustStock(productId: $productId, locationId: $locationId, quantityDelta: $quantityDelta) {
      id
      quantityDelta
    }
  }
`;

export default function InventoryPage() {
  const { formatMoney } = useBusinessCurrency();
  const { data, loading, refetch } = useQuery<{
    products?: { id: string; name: string; barcode?: string; price: number; imageUrl?: string | null }[];
    stockLevels?: { id: string; productId: string; locationId: string; quantity: number }[];
    locations?: { id: string; name: string; isDefault: boolean }[];
  }>(INVENTORY);
  const [adjustStock] = useMutation(ADJUST);
  const [deleteProduct] = useMutation(DELETE_PRODUCT);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<{
    id: string;
    name: string;
    barcode?: string;
    price: number;
    imageUrl?: string | null;
  } | null>(null);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [delta, setDelta] = useState("1");
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const qtyByProduct = new Map((data?.stockLevels ?? []).map((s) => [s.productId, s.quantity]));
  const inventoryPagination = useListPagination(data?.products ?? []);
  const defaultLoc = data?.locations?.find((l) => l.isDefault) ?? data?.locations?.[0];

  async function onAdjust(e: React.FormEvent) {
    e.preventDefault();
    const loc = locationId || defaultLoc?.id;
    const prod = productId || data?.products?.[0]?.id;
    if (!prod || !loc) return;
    await adjustStock({
      variables: { productId: prod, locationId: loc, quantityDelta: Number(delta) },
    });
    setProductId("");
    setLocationId("");
    setDelta("1");
    setScanValue("");
    setScanError(null);
    setDrawerOpen(false);
    await refetch();
  }

  function resolveScan(code: string) {
    const product = findProductByBarcode(data?.products ?? [], code);
    if (!product) {
      setScanError(`No product found for UPC ${code}`);
      return;
    }
    setScanError(null);
    setProductId(product.id);
    setScanValue("");
    qtyRef.current?.focus();
    qtyRef.current?.select();
  }

  const selectedProductId = productId || data?.products?.[0]?.id || "";
  const selectedLocationId = locationId || defaultLoc?.id || "";
  const selectedProduct = (data?.products ?? []).find((p) => p.id === selectedProductId);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels and adjustments."
        actions={<NewButton label="Adjust stock" onClick={() => setDrawerOpen(true)} />}
      />
      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Adjust stock"
        description="Increase or decrease on-hand quantity at a location."
        submitLabel="Apply adjustment"
        onSubmit={onAdjust}
      >
        <div className="grid gap-1">
          <Label htmlFor="inv-scan">Scan UPC</Label>
          <BarcodeScanInput
            id="inv-scan"
            focusWhen={drawerOpen}
            value={scanValue}
            onChange={(e) => {
              setScanValue(normalizeScannedBarcode(e.target.value));
              setScanError(null);
            }}
            onScan={resolveScan}
            placeholder="Scan product barcode"
          />
          {scanError ? <p className="text-xs text-destructive">{scanError}</p> : null}
          <p className="text-xs text-muted-foreground">
            Scan to select the product, then enter quantity and apply.
          </p>
        </div>
        <div className="grid gap-1">
          <Label>Product</Label>
          <Select
            value={selectedProductId || null}
            onValueChange={(value) => setProductId(value ?? "")}
          >
            <SelectTrigger className="h-auto min-h-10 w-full py-2">
              {selectedProduct ? (
                <ProductWithImage name={selectedProduct.name} imageUrl={selectedProduct.imageUrl} />
              ) : (
                <SelectValue placeholder="Select product" />
              )}
            </SelectTrigger>
            <SelectContent>
              {(data?.products ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id} className="py-2">
                  <ProductWithImage name={p.name} imageUrl={p.imageUrl} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label>Location</Label>
          <Select
            value={selectedLocationId || null}
            onValueChange={(value) => setLocationId(value ?? "")}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(data?.locations ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label>Quantity change</Label>
          <Input
            ref={qtyRef}
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="Use negative values to reduce stock"
            required
          />
          <p className="text-xs text-muted-foreground">Positive adds stock; negative removes it.</p>
        </div>
      </FormDrawer>
      <RecordViewDrawer
        open={viewProduct != null}
        onOpenChange={(open) => {
          if (!open) setViewProduct(null);
        }}
        title="Product"
        imageUrl={viewProduct?.imageUrl}
        imageAlt={viewProduct?.name ?? "Product"}
        fields={
          viewProduct
            ? [
                { label: "Name", value: viewProduct.name },
                { label: "Barcode", value: viewProduct.barcode ?? "" },
                { label: "On hand", value: String(qtyByProduct.get(viewProduct.id) ?? 0) },
                { label: "Price", value: formatMoney(viewProduct.price) },
              ]
            : []
        }
      />
      <PaginatedSection
        fill="page"
        footer={
          !loading ? <ListPagination {...inventoryPagination.paginationProps} /> : null
        }
      >
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowsSkeleton rows={6} cols={5} />
            ) : (
              inventoryPagination.pageItems.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <ProductWithImage name={p.name} imageUrl={p.imageUrl} />
                </TableCell>
                <TableCell>{p.barcode ?? "—"}</TableCell>
                <TableCell className="text-right">{qtyByProduct.get(p.id) ?? 0}</TableCell>
                <TableCell className="text-right">{formatMoney(p.price)}</TableCell>
                <TableCell>
                  <TableRowActions
                    onView={() => setViewProduct(p)}
                    onEdit={() => navigate("/products")}
                    onDelete={() =>
                      void deleteProduct({ variables: { id: p.id } }).then(() => refetch())
                    }
                  />
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
