import { Minus, Plus } from "lucide-react";
import type { ProductMetadataFieldDef } from "@/components/ProductMetadataEditor";
import { Button } from "@/components/ui/button";
import { EntityImage } from "@/components/default-entity-image";
import { cn } from "@/utils/cn";
import { PosProductMeta } from "./PosProductMeta";
import type { PosCatalogProduct } from "./pos-product-types";
import { productEffectiveUnitPrice } from "@/utils/product-line-pricing";
import { posProductDisplayName } from "@/utils/product-metadata-display";

export type PosProductMasonryCardProps = {
  product: PosCatalogProduct;
  categoryName?: string;
  metadataFields: ProductMetadataFieldDef[];
  formatMoney: (n: number) => string;
  cartQuantity: number;
  /** When set, quantity cannot exceed this (on-hand stock). */
  maxQuantity: number | null;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function PosProductMasonryCard({
  product,
  categoryName,
  metadataFields,
  formatMoney,
  cartQuantity,
  maxQuantity,
  onAdd,
  onIncrement,
  onDecrement,
}: PosProductMasonryCardProps) {
  const outOfStock = maxQuantity === 0;
  const atMax = maxQuantity != null && cartQuantity >= maxQuantity;
  const displayName = posProductDisplayName(product, metadataFields);

  return (
    <div
      className={cn(
        "mb-3 flex break-inside-avoid flex-col overflow-hidden rounded-lg border bg-card",
        outOfStock && "opacity-75",
      )}
    >
      <div className="flex flex-col text-left">
        <div className="h-[10rem] w-full overflow-hidden bg-transparent sm:h-[11rem]">
          <EntityImage
            src={product.imageUrl}
            alt={displayName}
            className="size-full bg-transparent object-cover"
          />
        </div>
        <div className="space-y-1.5 p-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{displayName}</p>
          <PosProductMeta
            product={product}
            metadataFields={metadataFields}
            categoryName={categoryName}
            formatMoney={formatMoney}
            compact
          />
          <p className="text-sm font-semibold tabular-nums">
            {product.discountType && product.discountType !== "NONE" && (product.discountValue ?? 0) > 0 ? (
              <>
                <span className="mr-1.5 font-normal text-muted-foreground line-through">
                  {formatMoney(product.price)}
                </span>
                {formatMoney(
                  productEffectiveUnitPrice(
                    product.price,
                    product.discountType,
                    product.discountValue,
                  ),
                )}
              </>
            ) : (
              formatMoney(product.price)
            )}
          </p>
          {maxQuantity != null ? (
            <p className="text-xs text-muted-foreground">
              {outOfStock ? "Out of stock" : `${maxQuantity} in stock`}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto border-t p-3">
        {cartQuantity === 0 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 w-full text-sm"
            disabled={outOfStock}
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            {outOfStock ? "Unavailable" : "Add to cart"}
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Decrease quantity"
              onClick={(e) => {
                e.stopPropagation();
                onDecrement();
              }}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="min-w-0 flex-1 text-center text-sm tabular-nums">
              {cartQuantity}
              {maxQuantity != null ? ` / ${maxQuantity}` : ""}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Increase quantity"
              disabled={atMax}
              onClick={(e) => {
                e.stopPropagation();
                onIncrement();
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
