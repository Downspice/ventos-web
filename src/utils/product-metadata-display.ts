import type { ProductMetadataFieldDef } from "@/components/ProductMetadataEditor";

export type ProductMetadataSource = {
  name: string;
  metadata?: Record<string, string> | null;
};

/** Metadata kept out of the POS display name (shown as badges / subtitle instead). */
export const POS_PRODUCT_DISPLAY_NAME_EXCLUDE_KEYS = ["type"] as const;

export type ProductMetadataTagOptions = {
  /** Omit these field keys from tag output. */
  excludeKeys?: readonly string[];
  /** When set, only include these field keys (unknown keys still included unless excluded). */
  includeKeys?: readonly string[];
};

function shouldIncludeMetadataKey(
  key: string,
  options: ProductMetadataTagOptions | undefined,
): boolean {
  if (options?.includeKeys?.length) {
    return options.includeKeys.includes(key);
  }
  if (options?.excludeKeys?.includes(key)) return false;
  return true;
}

/** Compact metadata values for tags or POS display names (value + unit, no field labels). */
export function buildProductMetadataTags(
  product: Pick<ProductMetadataSource, "metadata">,
  metadataFields: ProductMetadataFieldDef[],
  options?: ProductMetadataTagOptions,
): string[] {
  const meta = product.metadata;
  if (!meta || Object.keys(meta).length === 0) return [];
  const knownKeys = new Set(metadataFields.map((f) => f.key));
  const tags: string[] = [];
  for (const f of metadataFields) {
    if (!shouldIncludeMetadataKey(f.key, options)) continue;
    const v = meta[f.key];
    if (!v?.trim()) continue;
    const trimmed = v.trim();
    tags.push(f.unit?.trim() ? `${trimmed} ${f.unit.trim()}` : trimmed);
  }
  if (options?.includeKeys?.length) return tags;

  for (const [key, v] of Object.entries(meta)) {
    if (!knownKeys.has(key) && shouldIncludeMetadataKey(key, options) && String(v).trim()) {
      tags.push(String(v).trim());
    }
  }
  return tags;
}

/**
 * POS catalog / cart title: base product name plus variant attributes
 * (e.g. "Sparkling water · 500 ml · Bottle"). Product type stays in badges.
 */
export function posProductDisplayName(
  product: ProductMetadataSource,
  metadataFields: ProductMetadataFieldDef[],
  excludeKeys: readonly string[] = POS_PRODUCT_DISPLAY_NAME_EXCLUDE_KEYS,
): string {
  const suffix = buildProductMetadataTags(product, metadataFields, { excludeKeys });
  if (suffix.length === 0) return product.name;
  return `${product.name} · ${suffix.join(" · ")}`;
}
