import { matchesListSearch } from "@/utils/list-search";
import type { ProductMetadataFieldDef } from "@/components/ProductMetadataEditor";
import { buildProductMetadataTags } from "@/utils/product-metadata-display";

export type ProductListFilterState = {
  search: string;
  typeIds: string[];
  metadataValues: string[];
  minPrice: string;
  maxPrice: string;
};

type ProductLike = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  productTypeId?: string | null;
  metadata?: Record<string, string> | null;
};

export function metadataTagsForProductListFilter(
  p: ProductLike,
  allMetadataFields: ProductMetadataFieldDef[],
): string[] {
  const fieldsForProduct = allMetadataFields.filter(
    (f) => !p.productTypeId || f.productTypeId === p.productTypeId,
  );
  return buildProductMetadataTags({ metadata: p.metadata }, fieldsForProduct);
}

function parseOptionalPrice(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function hasActiveProductListFilters(state: ProductListFilterState): boolean {
  return (
    state.search.trim().length > 0 ||
    state.typeIds.length > 0 ||
    state.metadataValues.length > 0 ||
    state.minPrice.trim().length > 0 ||
    state.maxPrice.trim().length > 0
  );
}

export function collectMetadataFilterOptions(
  products: ProductLike[],
  allMetadataFields: ProductMetadataFieldDef[],
): { id: string; name: string }[] {
  const set = new Set<string>();
  for (const p of products) {
    for (const tag of metadataTagsForProductListFilter(p, allMetadataFields)) {
      set.add(tag);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b)).map((v) => ({ id: v, name: v }));
}

export function productMatchesListFilters(
  p: ProductLike,
  state: ProductListFilterState,
  ctx: {
    typeNameById: Map<string, string>;
    allMetadataFields: ProductMetadataFieldDef[];
  },
): boolean {
  if (state.typeIds.length > 0) {
    if (!p.productTypeId || !state.typeIds.includes(p.productTypeId)) return false;
  }

  const min = parseOptionalPrice(state.minPrice);
  const max = parseOptionalPrice(state.maxPrice);
  if (min != null && p.price < min) return false;
  if (max != null && p.price > max) return false;

  if (state.metadataValues.length > 0) {
    const tags = metadataTagsForProductListFilter(p, ctx.allMetadataFields);
    if (!state.metadataValues.some((v) => tags.includes(v))) return false;
  }

  const typeName = p.productTypeId ? ctx.typeNameById.get(p.productTypeId) : undefined;
  const metaHaystack = metadataTagsForProductListFilter(p, ctx.allMetadataFields).join(" ");
  return matchesListSearch(
    state.search,
    p.name,
    p.sku,
    p.barcode,
    typeName,
    metaHaystack,
    String(p.price),
  );
}
