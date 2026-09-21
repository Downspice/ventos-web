import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import type { ComputedTaxLine } from "@/utils/compute-sale-tax";

type Props = {
  subtotal: number;
  taxLines: ComputedTaxLine[];
  taxTotal: number;
  total: number;
  size?: "sm" | "md";
};

export function PosOrderTotals({ subtotal, taxLines, taxTotal, total, size = "md" }: Props) {
  const { formatMoney } = useBusinessCurrency();
  const totalClass = size === "md" ? "text-base font-semibold" : "text-sm font-semibold";

  return (
    <dl className="space-y-1.5 text-sm">
      {taxLines.length > 0 ? (
        <>
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
          </div>
          {taxLines.map((line) => (
            <div key={`${line.name}-${line.mode}`} className="flex justify-between text-muted-foreground">
              <dt>
                {line.name} ({line.rate}%{" "}
                {line.mode === "INCLUSIVE" ? "in price" : "on top"})
              </dt>
              <dd className="tabular-nums">{formatMoney(line.amount)}</dd>
            </div>
          ))}
          {taxTotal > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <dt>Tax</dt>
              <dd className="tabular-nums">{formatMoney(taxTotal)}</dd>
            </div>
          ) : null}
        </>
      ) : null}
      <div className={`flex justify-between ${totalClass}`}>
        <dt>Total</dt>
        <dd className="tabular-nums">{formatMoney(total)}</dd>
      </div>
    </dl>
  );
}
