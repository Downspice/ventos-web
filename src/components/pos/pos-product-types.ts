export type ProductDiscountType = "NONE" | "PERCENT" | "FIXED";

export type PosCatalogProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  metadata?: Record<string, string> | null;
  discountType?: ProductDiscountType;
  discountValue?: number;
  trackInventory?: boolean;
};
