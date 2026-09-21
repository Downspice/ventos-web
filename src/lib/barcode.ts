/** Strip control chars and whitespace from scanner / manual input. */
export function normalizeScannedBarcode(raw: string): string {
  return raw.replace(/[\r\n\t]/g, "").trim();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Match UPC-A (12) vs EAN-13 (13 with leading 0) and exact string forms. */
export function barcodesMatch(a: string, b: string): boolean {
  const na = normalizeScannedBarcode(a);
  const nb = normalizeScannedBarcode(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const da = digitsOnly(na);
  const db = digitsOnly(nb);
  if (!da || !db) return false;
  if (da === db) return true;

  const pad13 = (d: string) => d.padStart(13, "0");
  if (pad13(da) === pad13(db)) return true;

  const core12 = (d: string) => (d.length >= 12 ? d.slice(-12) : d.padStart(12, "0"));
  return core12(da) === core12(db);
}

export function findProductByBarcode<T extends { id: string; barcode?: string | null }>(
  products: T[],
  scanned: string,
): T | undefined {
  const code = normalizeScannedBarcode(scanned);
  if (!code) return undefined;
  return products.find((p) => p.barcode && barcodesMatch(p.barcode, code));
}

/** Match barcode (incl. UPC/EAN variants) or exact SKU. */
export function findProductByScanCode<
  T extends { id: string; barcode?: string | null; sku?: string | null },
>(products: T[], scanned: string): T | undefined {
  const byBarcode = findProductByBarcode(products, scanned);
  if (byBarcode) return byBarcode;
  const code = normalizeScannedBarcode(scanned);
  if (!code) return undefined;
  const lower = code.toLowerCase();
  return products.find((p) => p.sku && normalizeScannedBarcode(p.sku).toLowerCase() === lower);
}
