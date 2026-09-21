export type PosStockProduct = {
  id: string;
  trackInventory?: boolean;
};

/** `null` means no stock cap (inventory not tracked). */
export function posMaxStock(
  product: PosStockProduct,
  stockByProductId: Map<string, number>,
): number | null {
  if (!product.trackInventory) return null;
  const onHand = stockByProductId.get(product.id) ?? 0;
  return Math.max(0, Math.floor(onHand));
}

export function clampPosCartQuantity(desired: number, max: number | null): number {
  const qty = Math.max(0, desired);
  if (max === null) return qty;
  return Math.min(qty, max);
}
