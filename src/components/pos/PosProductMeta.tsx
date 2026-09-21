import { Badge } from "@/components/ui/badge";
import type { ProductMetadataFieldDef } from "@/components/ProductMetadataEditor";
import {
  POS_PRODUCT_DISPLAY_NAME_EXCLUDE_KEYS,
  buildProductMetadataTags,
} from "@/utils/product-metadata-display";
import { cn } from "@/utils/cn";
import type { PosCatalogProduct } from "./pos-product-types";

function posDiscountLabel(
  product: PosCatalogProduct,
  formatMoney: (n: number) => string,
): string | null {
  const type = product.discountType ?? "NONE";
  const value = product.discountValue ?? 0;
  if (type === "NONE" || !value) return null;
  if (type === "PERCENT") return `${value}% off`;
  return `${formatMoney(value)} off`;
}

export function PosProductMeta({
  product,
  metadataFields,
  categoryName,
  formatMoney,
  compact = false,
}: {
  product: PosCatalogProduct;
  metadataFields: ProductMetadataFieldDef[];
  categoryName?: string;
  formatMoney: (n: number) => string;
  compact?: boolean;
}) {
  const metaTags = buildProductMetadataTags(product, metadataFields, {
    includeKeys: [...POS_PRODUCT_DISPLAY_NAME_EXCLUDE_KEYS],
  });
  const discount = posDiscountLabel(product, formatMoney);
  const idParts = [product.sku && `SKU ${product.sku}`, product.barcode && `Barcode ${product.barcode}`].filter(
    Boolean,
  ) as string[];

  const hasContent = categoryName || idParts.length > 0 || metaTags.length > 0 || discount;
  if (!hasContent) return null;

  const maxTags = compact ? 2 : 4;
  const visibleTags = metaTags.slice(0, maxTags);
  const hiddenTagCount = metaTags.length - visibleTags.length;

  return (
    <div className={cn("space-y-1", compact ? "mt-0.5" : "mt-1")}>
      {categoryName || idParts.length > 0 ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {[categoryName, ...idParts].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      {visibleTags.length > 0 || discount ? (
        <div className="flex flex-wrap gap-1">
          {discount ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
              {discount}
            </Badge>
          ) : null}
          {visibleTags.map((tag) => (
            <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
              {tag}
            </Badge>
          ))}
          {hiddenTagCount > 0 ? (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
              +{hiddenTagCount} more
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
