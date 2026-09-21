import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { EntityImageThumb } from "@/components/EntityImageField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RETURN_REASON_CUSTOM,
  RETURN_REASON_PRESETS,
  resolveReturnReason,
} from "@/constants/return-reasons";
import { MoneyInput } from "@/components/money-input";
import { RadioGroup, RadioGroupItem } from "@/components/align-ui/radio-group";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";

export type ReturnableSale = {
  id: string;
  total: number;
  createdAt: string;
  lines: {
    productId?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    lineType: string;
  }[];
};

const PRODUCT_IMAGES = gql`
  query ReturnProductImages {
    products {
      id
      imageUrl
    }
  }
`;

const CREATE_RETURN = gql`
  mutation ProcessReturn(
    $saleId: ID!
    $lines: [ReturnLineInput!]!
    $reason: String
    $kind: ReturnKind
    $stockDisposition: ReturnStockDisposition
  ) {
    createReturn(
      saleId: $saleId
      lines: $lines
      reason: $reason
      kind: $kind
      stockDisposition: $stockDisposition
    ) {
      id
      totalRefund
    }
  }
`;

type LineDraft = {
  key: string;
  productId: string;
  name: string;
  maxQty: number;
  unitPrice: number;
  lineTotal: number;
  selected: boolean;
  returnQty: number;
  refundAmount: number;
};

function lineKey(productId: string, index: number) {
  return `${productId}-${index}`;
}

function defaultRefund(unitPrice: number, qty: number, lineTotal: number, soldQty: number) {
  const perUnit = soldQty > 0 ? lineTotal / soldQty : unitPrice;
  return Math.round(perUnit * qty * 100) / 100;
}

type Props = {
  sale: ReturnableSale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function ProcessReturnDialog({ sale, open, onOpenChange, onSuccess }: Props) {
  const { formatMoney } = useBusinessCurrency();
  const [createReturn, { loading }] = useMutation(CREATE_RETURN);
  const { data: productImagesData } = useQuery<{ products?: { id: string; imageUrl?: string | null }[] }>(
    PRODUCT_IMAGES,
    { skip: !open },
  );
  const imageUrlByProductId = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    for (const p of productImagesData?.products ?? []) map.set(p.id, p.imageUrl);
    return map;
  }, [productImagesData?.products]);
  const [reasonPreset, setReasonPreset] = useState<string>(RETURN_REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState("");
  const [kind, setKind] = useState<"RETURN" | "REFUND">("RETURN");
  const [stockDisposition, setStockDisposition] = useState<"RESTOCK" | "WASTE">("RESTOCK");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sale || !open) return;
    const productLines = sale.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.lineType === "PRODUCT" && line.productId);
    setLines(
      productLines.map(({ line, index }) => ({
        key: lineKey(line.productId!, index),
        productId: line.productId!,
        name: line.name,
        maxQty: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        selected: false,
        returnQty: 1,
        refundAmount: defaultRefund(line.unitPrice, 1, line.lineTotal, line.quantity),
      })),
    );
    setReasonPreset(RETURN_REASON_PRESETS[0]);
    setCustomReason("");
    setKind("RETURN");
    setStockDisposition("RESTOCK");
    setError(null);
  }, [sale, open]);

  const selectedLines = useMemo(() => lines.filter((l) => l.selected), [lines]);
  const totalRefund = useMemo(
    () => selectedLines.reduce((sum, l) => sum + l.refundAmount, 0),
    [selectedLines],
  );

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.returnQty != null) {
          const qty = Math.min(Math.max(1, patch.returnQty), l.maxQty);
          next.returnQty = qty;
          next.refundAmount = defaultRefund(l.unitPrice, qty, l.lineTotal, l.maxQty);
        }
        return next;
      }),
    );
  }

  async function submit() {
    if (!sale) return;
    if (selectedLines.length === 0) {
      setError("Select at least one item to return or refund.");
      return;
    }
    setError(null);
    try {
      await createReturn({
        variables: {
          saleId: sale.id,
          reason: resolveReturnReason(reasonPreset, customReason),
          kind,
          stockDisposition: kind === "RETURN" ? stockDisposition : undefined,
          lines: selectedLines.map((l) => ({
            productId: l.productId,
            quantity: l.returnQty,
            refundAmount: l.refundAmount,
          })),
        },
      });
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process return");
    }
  }

  const productLineCount = lines.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Process return or refund</DialogTitle>
          <DialogDescription>
            {sale ? (
              <>
                Sale <span className="font-mono text-foreground">{sale.id.slice(-8)}</span> ·{" "}
                {new Date(sale.createdAt).toLocaleString()} · Order{" "}
                {formatMoney(sale.total)}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
          {productLineCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              This sale has no returnable product lines.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li
                  key={line.key}
                  className="rounded-lg border p-3 ring-1 ring-inset ring-stroke-soft-200"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={line.key}
                      checked={line.selected}
                      onCheckedChange={(checked) =>
                        updateLine(line.key, { selected: checked === true })
                      }
                      className="mt-0.5"
                    />
                    <EntityImageThumb
                      url={imageUrlByProductId.get(line.productId)}
                      name={line.name}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <label htmlFor={line.key} className="block cursor-pointer text-sm font-medium">
                        {line.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Sold {line.maxQty} · {formatMoney(line.unitPrice)} each
                      </p>
                      {line.selected ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-1">
                            <Label htmlFor={`${line.key}-qty`} className="text-xs">
                              Qty returning
                            </Label>
                            <Input
                              id={`${line.key}-qty`}
                              type="number"
                              min={1}
                              max={line.maxQty}
                              value={line.returnQty}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  returnQty: Number(e.target.value) || 1,
                                })
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor={`${line.key}-refund`} className="text-xs">
                              Refund amount
                            </Label>
                            <MoneyInput
                              id={`${line.key}-refund`}
                              value={String(line.refundAmount)}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                updateLine(line.key, {
                                  refundAmount: Number.isFinite(n) ? n : 0,
                                });
                              }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-1">
            <Label htmlFor="return-reason-preset">Return reason</Label>
            <Select value={reasonPreset} onValueChange={(v) => setReasonPreset(v ?? RETURN_REASON_PRESETS[0])}>
              <SelectTrigger id="return-reason-preset" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASON_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {preset === RETURN_REASON_CUSTOM ? "Other (custom)" : preset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reasonPreset === RETURN_REASON_CUSTOM ? (
            <div className="grid gap-1">
              <Label htmlFor="return-reason-custom">Custom reason</Label>
              <Input
                id="return-reason-custom"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe why items are being returned…"
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Type</Label>
            <RadioGroup
              value={kind}
              onValueChange={(v) => setKind((v as "RETURN" | "REFUND") ?? "RETURN")}
              className="gap-3"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="RETURN" id="kind-return" />
                <Label htmlFor="kind-return" className="cursor-pointer font-normal">
                  Return — customer brings items back
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="REFUND" id="kind-refund" />
                <Label htmlFor="kind-refund" className="cursor-pointer font-normal">
                  Refund — money back only (no stock change)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {kind === "RETURN" ? (
            <div className="grid gap-2">
              <Label>Inventory</Label>
              <RadioGroup
                value={stockDisposition}
                onValueChange={(v) =>
                  setStockDisposition((v as "RESTOCK" | "WASTE") ?? "RESTOCK")
                }
                className="gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="RESTOCK" id="stock-restock" />
                  <Label htmlFor="stock-restock" className="cursor-pointer font-normal">
                    Back to stock
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="WASTE" id="stock-waste" />
                  <Label htmlFor="stock-waste" className="cursor-pointer font-normal">
                    Wasted / not restocked
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm font-semibold">
            <span>Total refund</span>
            <span className="tabular-nums">{formatMoney(totalRefund)}</span>
          </div>

          {error ? <p className="text-sm text-error-base">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 border-t pt-4 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || productLineCount === 0 || selectedLines.length === 0}
            onClick={() => void submit()}
          >
            {loading ? "Processing…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
