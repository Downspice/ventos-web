import type { ProductDiscountType } from "@/components/pos/pos-product-types";

export function productUnitDiscount(
  discountType: ProductDiscountType | undefined,
  discountValue: number | undefined,
  unitPrice: number,
): number {
  const type = discountType ?? "NONE";
  const value = discountValue ?? 0;
  if (type === "NONE" || value <= 0 || unitPrice <= 0) return 0;
  if (type === "PERCENT") return unitPrice * (value / 100);
  if (type === "FIXED") return Math.min(value, unitPrice);
  return 0;
}

export function productLineDiscountAmount(
  quantity: number,
  unitPrice: number,
  discountType: ProductDiscountType | undefined,
  discountValue: number | undefined,
): number {
  return quantity * productUnitDiscount(discountType, discountValue, unitPrice);
}

export function productLineTotal(
  quantity: number,
  unitPrice: number,
  discountType: ProductDiscountType | undefined,
  discountValue: number | undefined,
): number {
  return Math.max(
    0,
    quantity * unitPrice -
      productLineDiscountAmount(quantity, unitPrice, discountType, discountValue),
  );
}

export function productEffectiveUnitPrice(
  unitPrice: number,
  discountType: ProductDiscountType | undefined,
  discountValue: number | undefined,
): number {
  return Math.max(0, unitPrice - productUnitDiscount(discountType, discountValue, unitPrice));
}
