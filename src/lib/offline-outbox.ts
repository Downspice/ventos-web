/** Client-side offline queue stub (sync via GraphQL syncPush when online). */
const KEY = "ventos_offbox";

export type OutboxItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  clientUpdatedAt: string;
};

export function listOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as OutboxItem[];
  } catch {
    return [];
  }
}

export function enqueue(item: Omit<OutboxItem, "id">): void {
  const items = listOutbox();
  items.push({ ...item, id: crypto.randomUUID() });
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function clearOutbox(ids: string[]): void {
  const remaining = listOutbox().filter((i) => !ids.includes(i.id));
  localStorage.setItem(KEY, JSON.stringify(remaining));
}
