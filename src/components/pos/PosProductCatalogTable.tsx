import { Minus, Plus } from "lucide-react";
import type { ProductMetadataFieldDef } from "@/components/ProductMetadataEditor";
import { EntityImageThumb } from "@/components/EntityImageField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils/cn";
import { productEffectiveUnitPrice } from "@/utils/product-line-pricing";
import {
  buildProductMetadataTags,
  posProductDisplayName,
} from "@/utils/product-metadata-display";
import type { PosCatalogProduct } from "./pos-product-types";

function PosProductPriceCell({
  product,
  formatMoney,
}: {
  product: PosCatalogProduct;
  formatMoney: (n: number) => string;
}) {
  const type = product.discountType ?? "NONE";
  const value = product.discountValue ?? 0;
  const hasDiscount = type !== "NONE" && value > 0;
  const effective = productEffectiveUnitPrice(product.price, type, value);

  if (!hasDiscount) {
    return <span className="tabular-nums">{formatMoney(product.price)}</span>;
  }

  return (
    <span className="tabular-nums">
      <span className="mr-1.5 text-muted-foreground line-through">{formatMoney(product.price)}</span>
      {formatMoney(effective)}
    </span>
  );
}

export function PosProductCatalogTable({
  products,
  metadataFields,
  formatMoney,
  cartQuantityByProductId,
  maxForProduct,
  onAdd,
  onSetQuantity,
}: {
  products: PosCatalogProduct[];
  metadataFields: ProductMetadataFieldDef[];
  formatMoney: (n: number) => string;
  cartQuantityByProductId: Map<string, number>;
  maxForProduct: (product: PosCatalogProduct) => number | null;
  onAdd: (product: PosCatalogProduct) => void;
  onSetQuantity: (product: PosCatalogProduct, quantity: number) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Image</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Barcode</TableHead>
          <TableHead className="min-w-[12rem]">Metadata</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="w-[8.5rem] text-right">Cart</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const displayName = posProductDisplayName(product, metadataFields);
          const tags = buildProductMetadataTags(product, metadataFields);
          const cartQty = cartQuantityByProductId.get(product.id) ?? 0;
          const max = maxForProduct(product);
          const outOfStock = max === 0;
          const atMax = max != null && cartQty >= max;

          return (
            <TableRow
              key={product.id}
              className={cn(
                "cursor-pointer",
                outOfStock && "opacity-60",
              )}
              onClick={() => {
                if (!outOfStock) onAdd(product);
              }}
            >
              <TableCell>
                <EntityImageThumb url={product.imageUrl} name={displayName} />
              </TableCell>
              <TableCell className="font-medium">{displayName}</TableCell>
              <TableCell>{product.sku ?? "—"}</TableCell>
              <TableCell>{product.barcode ?? "—"}</TableCell>
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
              <TableCell className="text-right">
                <PosProductPriceCell product={product} formatMoney={formatMoney} />
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                {outOfStock ? (
                  <span className="text-xs text-muted-foreground">Out of stock</span>
                ) : cartQty === 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onAdd(product)}
                  >
                    Add
                  </Button>
                ) : (
                  <div className="inline-flex items-center gap-0.5">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      aria-label="Decrease quantity"
                      onClick={() => onSetQuantity(product, cartQty - 1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-7 text-center text-xs tabular-nums">{cartQty}</span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      aria-label="Increase quantity"
                      disabled={atMax}
                      onClick={() => onAdd(product)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
