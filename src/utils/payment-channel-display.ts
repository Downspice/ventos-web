export type PaymentChannelRow = {
  id: string;
  type: "BANK_ACCOUNT" | "MOBILE_MONEY";
  name: string;
  accountNumber?: string | null;
  network?: string | null;
  number?: string | null;
};

/** POS checkout payment methods (stored on the sale as CASH / BANK / MOBILE_MONEY). */
export type PaymentMethod = "CASH" | "BANK" | "MOBILE_MONEY";

export function channelSummary(row: PaymentChannelRow): string {
  if (row.type === "BANK_ACCOUNT") {
    return row.accountNumber ?? "—";
  }
  return [row.network, row.number].filter(Boolean).join(" · ") || "—";
}

export function channelSelectLabel(row: PaymentChannelRow): string {
  const detail = channelSummary(row);
  return detail === "—" ? row.name : `${row.name} · ${detail}`;
}

export function paymentChannelsForMethod(
  method: PaymentMethod,
  channels: PaymentChannelRow[],
): PaymentChannelRow[] {
  if (method === "CASH") return [];
  if (method === "BANK") {
    return channels.filter((c) => c.type === "BANK_ACCOUNT");
  }
  return channels.filter((c) => c.type === "MOBILE_MONEY");
}

export function paymentChannelRequired(
  method: PaymentMethod,
  channels: PaymentChannelRow[],
): boolean {
  return paymentChannelsForMethod(method, channels).length > 0;
}
