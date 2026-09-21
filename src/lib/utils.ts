export { cn } from "@/utils/cn";

export function isFieldEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Date) return isNaN(value.getTime());
  if (typeof value === "boolean") return false;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}
