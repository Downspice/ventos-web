import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { apiUrl } from "@/lib/apollo";
import { LayoutGrid, List, Minus, Plus, ScanBarcode, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { MoneyInput } from "@/components/money-input";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { EntityImage } from "@/components/default-entity-image";
import type { ProductMetadataFieldDef } from "@/components/ProductMetadataEditor";
import {
  buildProductMetadataTags,
  posProductDisplayName,
} from "@/utils/product-metadata-display";
import { PosProductCatalogTable } from "@/components/pos/PosProductCatalogTable";
import { PosProductMasonryCard } from "@/components/pos/PosProductMasonryCard";
import type { PosCatalogProduct } from "@/components/pos/pos-product-types";
import { clampPosCartQuantity, posMaxStock } from "@/components/pos/pos-stock";
import { PosOrderTotals } from "@/components/pos/PosOrderTotals";
import { computeSaleTax } from "@/utils/compute-sale-tax";
import { PosCustomerSelect, type PosCustomer } from "@/components/pos/PosCustomerSelect";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { findProductByScanCode, normalizeScannedBarcode } from "@/lib/barcode";
import { cn } from "@/utils/cn";
import { PosSalesList } from "@/components/pos/PosSalesList";
import { productLineDiscountAmount } from "@/utils/product-line-pricing";
import {
  channelSelectLabel,
  paymentChannelRequired,
  paymentChannelsForMethod,
  type PaymentChannelRow,
} from "@/utils/payment-channel-display";

type ProductRow = PosCatalogProduct;

type ProductCatalogView = "list" | "masonry";

type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
};

type PaymentMethod = "CASH" | "BANK" | "MOBILE_MONEY";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
];

const POS_DATA = gql`
  query PosData {
    products {
      id
      name
      price
      imageUrl
      sku
      barcode
      categoryId
      metadata
      discountType
      discountValue
      trackInventory
    }
    stockLevels {
      productId
      quantity
    }
    productCategories {
      id
      name
    }
    productMetadataFields(includeInactive: false) {
      key
      label
      unit
      active
    }
    openRegisterSessions {
      id
      registerId
    }
    cashRegisters {
      id
      name
    }
    customers {
      id
      firstName
      lastName
      email
      phone
    }
    taxRules {
      id
      name
      rate
      mode
      isActive
    }
    paymentChannels {
      id
      type
      name
      accountNumber
      network
      number
    }
  }
`;

const OPEN_SESSION = gql`
  mutation OpenSession($registerId: ID!) {
    openRegisterSession(registerId: $registerId, openingFloat: 0) {
      id
    }
  }
`;

const CREATE_SALE = gql`
  mutation CreateSale(
    $registerSessionId: ID
    $customerId: ID
    $lines: [SaleLineInput!]!
  ) {
    createSaleDraft(registerSessionId: $registerSessionId, customerId: $customerId, lines: $lines) {
      id
      total
    }
  }
`;

const FINALIZE = gql`
  mutation Finalize($id: ID!, $payments: [PaymentInput!]!) {
    finalizeSale(id: $id, payments: $payments) {
      id
      total
    }
  }
`;

function lineTotal(line: CartLine) {
  return Math.max(0, line.quantity * line.unitPrice - line.discountAmount);
}

export default function PosPage() {
  const { formatMoney } = useBusinessCurrency();
  const { data, refetch } = useQuery<{
    products?: ProductRow[];
    stockLevels?: { productId: string; quantity: number }[];
    productCategories?: { id: string; name: string }[];
    productMetadataFields?: ProductMetadataFieldDef[];
    openRegisterSessions?: { id: string; registerId: string }[];
    cashRegisters?: { id: string; name: string }[];
    customers?: PosCustomer[];
    taxRules?: {
      id: string;
      name: string;
      rate: number;
      mode: "INCLUSIVE" | "EXCLUSIVE";
      isActive: boolean;
    }[];
    paymentChannels?: PaymentChannelRow[];
  }>(POS_DATA);

  const [openSession] = useMutation(OPEN_SESSION);
  const [createSale] = useMutation(CREATE_SALE);
  const [finalizeSale] = useMutation(FINALIZE);

  const [orderActive, setOrderActive] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productView, setProductView] = useState<ProductCatalogView>("masonry");
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentChannelId, setPaymentChannelId] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);

  const sessionId = data?.openRegisterSessions?.[0]?.id;
  const registerName = data?.cashRegisters?.find(
    (r) => r.id === data?.openRegisterSessions?.[0]?.registerId,
  )?.name;

  const metadataFields = useMemo(
    () => (data?.productMetadataFields ?? []).filter((f) => f.active !== false),
    [data?.productMetadataFields],
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.productCategories ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [data?.productCategories]);

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.stockLevels ?? []) {
      map.set(row.productId, (map.get(row.productId) ?? 0) + row.quantity);
    }
    return map;
  }, [data?.stockLevels]);

  const productById = useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const p of data?.products ?? []) {
      map.set(p.id, p);
    }
    return map;
  }, [data?.products]);

  const cartQuantityByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) {
      map.set(line.productId, line.quantity);
    }
    return map;
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = data?.products ?? [];
    if (!q) return list;
    return list.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (posProductDisplayName(p, metadataFields).toLowerCase().includes(q)) return true;
      if (p.sku?.toLowerCase().includes(q)) return true;
      if (p.barcode?.toLowerCase().includes(q)) return true;
      const category = p.categoryId ? categoryNameById.get(p.categoryId) : undefined;
      if (category?.toLowerCase().includes(q)) return true;
      const tags = buildProductMetadataTags(p, metadataFields);
      return tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [data?.products, productSearch, categoryNameById, metadataFields]);

  const cartSubtotal = useMemo(() => cart.reduce((sum, line) => sum + lineTotal(line), 0), [cart]);

  const cartTaxSummary = useMemo(
    () => computeSaleTax(cartSubtotal, data?.taxRules ?? []),
    [cartSubtotal, data?.taxRules],
  );

  const orderTotal = cartTaxSummary.total;

  const paymentChannels = data?.paymentChannels ?? [];
  const channelsForMethod = useMemo(
    () => paymentChannelsForMethod(paymentMethod, paymentChannels),
    [paymentMethod, paymentChannels],
  );
  const channelRequired = paymentChannelRequired(paymentMethod, paymentChannels);
  const channelOk = !channelRequired || paymentChannelId.length > 0;

  const tenderedAmount = Number.parseFloat(cashTendered);
  const cashChange =
    paymentMethod === "CASH" && Number.isFinite(tenderedAmount)
      ? Math.max(0, tenderedAmount - orderTotal)
      : 0;

  const canPayCash =
    paymentMethod === "CASH" && Number.isFinite(tenderedAmount) && tenderedAmount >= orderTotal;
  const canPayElectronic =
    paymentMethod !== "CASH" &&
    transactionRef.trim().length > 0 &&
    orderTotal > 0 &&
    channelOk;
  const canConfirmPay = cart.length > 0 && (canPayCash || canPayElectronic);

  function startOrder() {
    setCart([]);
    setProductSearch("");
    setScanValue("");
    setScanError(null);
    setCheckoutError(null);
    setCustomerId(null);
    setOrderActive(true);
  }

  function cancelOrder() {
    setCart([]);
    setOrderActive(false);
    setPayOpen(false);
    setCustomerId(null);
    setScanValue("");
    setScanError(null);
    resetPaymentForm();
  }

  function resolveBarcodeScan(code: string) {
    setScanError(null);
    const product = findProductByScanCode(data?.products ?? [], code);
    if (!product) {
      setScanError(`No product found for ${code}`);
      setScanValue("");
      return;
    }
    const max = maxForProduct(product);
    if (max === 0) {
      setScanError(`${product.name} is out of stock`);
      setScanValue("");
      return;
    }
    const current = cartQuantityByProductId.get(product.id) ?? 0;
    if (max != null && current >= max) {
      setScanError(`Maximum stock for ${product.name}`);
      setScanValue("");
      return;
    }
    addProduct(product);
    setScanValue("");
  }

  function resetPaymentForm() {
    setPaymentMethod("CASH");
    setPaymentChannelId("");
    setCashTendered("");
    setTransactionRef("");
    setCheckoutError(null);
  }

  function applyPaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);
    setCheckoutError(null);
    const options = paymentChannelsForMethod(method, paymentChannels);
    setPaymentChannelId(options[0]?.id ?? "");
    if (method === "CASH") {
      setCashTendered(orderTotal > 0 ? String(orderTotal) : "");
      setTransactionRef("");
    } else {
      setTransactionRef("");
    }
  }

  function maxForProduct(product: ProductRow) {
    return posMaxStock(product, stockByProductId);
  }

  function setProductCartQuantity(product: ProductRow, desired: number) {
    if (!orderActive) return;
    const max = maxForProduct(product);
    const quantity = clampPosCartQuantity(desired, max);
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((l) => l.productId !== product.id);
      }
      const discountAmount = productLineDiscountAmount(
        quantity,
        product.price,
        product.discountType,
        product.discountValue,
      );
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity, discountAmount } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: posProductDisplayName(product, metadataFields),
          unitPrice: product.price,
          quantity,
          discountAmount,
        },
      ];
    });
  }

  function addProduct(product: ProductRow) {
    const current = cartQuantityByProductId.get(product.id) ?? 0;
    setProductCartQuantity(product, current + 1);
  }

  function setLineQuantity(productId: string, quantity: number) {
    const product = productById.get(productId);
    if (!product) {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((l) => l.productId !== productId));
      }
      return;
    }
    setProductCartQuantity(product, quantity);
  }

  async function ensureRegisterSession(): Promise<string | undefined> {
    if (sessionId) return sessionId;
    const registerId = data?.cashRegisters?.[0]?.id;
    if (!registerId) return undefined;
    const opened = await openSession({ variables: { registerId } });
    const id = (opened.data as { openRegisterSession?: { id: string } })?.openRegisterSession?.id;
    await refetch();
    return id;
  }

  async function fetchReceipt(saleId: string, total: number) {
    const res = await fetch(`${apiUrl}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${localStorage.getItem("ventos_access") ?? ""}`,
      },
      body: JSON.stringify({
        query: `query R($saleId: ID!) { saleReceipt(saleId: $saleId) { html } }`,
        variables: { saleId },
      }),
    });
    const json = (await res.json()) as { data?: { saleReceipt?: { html: string } } };
    const html = json.data?.saleReceipt?.html;
    if (html) {
      const w = window.open("", "_blank");
      w?.document.write(html);
      w?.print();
    } else {
      alert(`Sale finalized: ${formatMoney(total)}`);
    }
  }

  async function confirmPayment() {
    if (!canConfirmPay) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const activeSession = await ensureRegisterSession();
      const draft = await createSale({
        variables: {
          registerSessionId: activeSession,
          customerId: customerId ?? undefined,
          lines: cart.map((line) => ({
            lineType: "PRODUCT",
            productId: line.productId,
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountAmount: line.discountAmount,
          })),
        },
      });
      const draftData = draft.data as { createSaleDraft?: { id: string; total: number } };
      const saleId = draftData?.createSaleDraft?.id;
      const total = draftData?.createSaleDraft?.total ?? orderTotal;
      if (!saleId) {
        setCheckoutError("Could not create sale.");
        return;
      }

      const payments =
        paymentMethod === "CASH"
          ? [{ method: "CASH", amount: total }]
          : [
              {
                method: paymentMethod,
                amount: total,
                reference: transactionRef.trim(),
                paymentChannelId: paymentChannelId || undefined,
              },
            ];

      await finalizeSale({
        variables: { id: saleId, payments },
      });

      setPayOpen(false);
      setOrderActive(false);
      setCart([]);
      setCustomerId(null);
      resetPaymentForm();
      setSalesRefreshKey((k) => k + 1);
      await fetchReceipt(saleId, total);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  }

  function openPayDialog() {
    resetPaymentForm();
    applyPaymentMethod("CASH");
    setPayOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Point of sale"
        description="Create an order, add products, and take payment at checkout."
        actions={
          <Button type="button" onClick={startOrder} className="gap-2">
            <ShoppingCart className="size-4" />
            Create order
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {sessionId ? (
          <Badge variant="outline">
            Register open{registerName ? `: ${registerName}` : ""}
          </Badge>
        ) : (
          <span>
            No open session — open one in Admin → Registers, or one will open at checkout if a
            register exists.
          </span>
        )}
      </div>

      <PosSalesList refreshKey={salesRefreshKey} />

      <Dialog
        open={orderActive}
        onOpenChange={(open) => {
          if (!open) cancelOrder();
        }}
      >
        <DialogContent
          className={cn(
            "flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-1.5rem)]",
            "h-[calc(100dvh-1.5rem)]",
          )}
          onInteractOutside={(e) => {
            if (payOpen) e.preventDefault();
          }}
        >
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-4 py-3 pr-12 md:px-6">
            <div className="min-w-0 space-y-1">
              <DialogHeader className="mb-0 space-y-0.5 text-left">
                <DialogTitle className="text-lg">New order</DialogTitle>
                <DialogDescription className="text-xs">
                  Add products, set customer, then pay.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                {sessionId ? (
                  <Badge variant="outline" className="text-[10px]">
                    Register open{registerName ? `: ${registerName}` : ""}
                  </Badge>
                ) : null}
                <Badge className="text-[10px]">Order in progress</Badge>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={cancelOrder}>
                Cancel order
              </Button>
              <Button
                type="button"
                onClick={openPayDialog}
                disabled={cart.length === 0}
              >
                Pay now · {formatMoney(orderTotal)}
              </Button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 md:gap-6 md:p-6 lg:grid-cols-[minmax(0,1fr)_min(100%,17.5rem)] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_19rem]">
          <Card className="flex h-full min-h-0 min-w-0 flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Products</CardTitle>
                <div
                  className="flex shrink-0 rounded-lg border p-0.5"
                  role="group"
                  aria-label="Product catalog view"
                >
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={productView === "list" ? "secondary" : "ghost"}
                    aria-pressed={productView === "list"}
                    aria-label="List view"
                    onClick={() => setProductView("list")}
                  >
                    <List className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={productView === "masonry" ? "secondary" : "ghost"}
                    aria-pressed={productView === "masonry"}
                    aria-label="Masonry view"
                    onClick={() => setProductView("masonry")}
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <ScanBarcode className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <BarcodeScanInput
                    id="pos-barcode-scan"
                    focusWhen={orderActive && !payOpen}
                    value={scanValue}
                    onChange={(e) => {
                      setScanValue(normalizeScannedBarcode(e.target.value));
                      setScanError(null);
                    }}
                    onScan={resolveBarcodeScan}
                    placeholder="Scan barcode to add to cart"
                    className="pl-9"
                    aria-describedby={scanError ? "pos-scan-error" : undefined}
                  />
                </div>
                {scanError ? (
                  <p id="pos-scan-error" className="text-xs text-destructive">
                    {scanError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    USB scanners work here — scan sends Enter to add one unit.
                  </p>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-0">
              {filteredProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No products found.</p>
              ) : productView === "list" ? (
                <PosProductCatalogTable
                  products={filteredProducts}
                  metadataFields={metadataFields}
                  formatMoney={formatMoney}
                  cartQuantityByProductId={cartQuantityByProductId}
                  maxForProduct={maxForProduct}
                  onAdd={addProduct}
                  onSetQuantity={setProductCartQuantity}
                />
              ) : (
                <div className="columns-2 gap-3 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4">
                  {filteredProducts.map((product) => (
                    <PosProductMasonryCard
                      key={product.id}
                      product={product}
                      categoryName={
                        product.categoryId ? categoryNameById.get(product.categoryId) : undefined
                      }
                      metadataFields={metadataFields}
                      formatMoney={formatMoney}
                      cartQuantity={cartQuantityByProductId.get(product.id) ?? 0}
                      maxQuantity={maxForProduct(product)}
                      onAdd={() => addProduct(product)}
                      onIncrement={() => addProduct(product)}
                      onDecrement={() => {
                        const current = cartQuantityByProductId.get(product.id) ?? 0;
                        setProductCartQuantity(product, current - 1);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex h-full min-h-0 flex-col">
            <CardHeader className="space-y-3 pb-2">
              <CardTitle className="text-base">Current order</CardTitle>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Customer</Label>
                <PosCustomerSelect
                  customers={data?.customers ?? []}
                  value={customerId}
                  onChange={setCustomerId}
                />
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
              {cart.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Tap products to add them here.
                </p>
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
                  {cart.map((line) => {
                    const cartProduct = productById.get(line.productId);
                    const lineMax = cartProduct ? maxForProduct(cartProduct) : null;
                    const lineAtMax = lineMax != null && line.quantity >= lineMax;
                    return (
                    <li
                      key={line.productId}
                      className="flex shrink-0 items-center gap-2 border-b pb-2 last:border-0"
                    >
                      <EntityImage
                        src={cartProduct?.imageUrl}
                        alt={line.name}
                        className="size-10 shrink-0 rounded-md border object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-snug">{line.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {line.discountAmount > 0 ? (
                            <>
                              <span className="line-through">{formatMoney(line.unitPrice)}</span>
                              {" · "}
                              {formatMoney(lineTotal(line) / line.quantity)} each
                            </>
                          ) : (
                            formatMoney(line.unitPrice)
                          )}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-0.5">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label="Decrease quantity"
                            onClick={() => setLineQuantity(line.productId, line.quantity - 1)}
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-7 text-center text-xs tabular-nums">{line.quantity}</span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label="Increase quantity"
                            disabled={lineAtMax}
                            onClick={() => setLineQuantity(line.productId, line.quantity + 1)}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p className="text-xs font-medium tabular-nums sm:text-sm">
                          {formatMoney(lineTotal(line))}
                        </p>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          aria-label="Remove line"
                          onClick={() => setLineQuantity(line.productId, 0)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 shrink-0 border-t pt-3">
                <PosOrderTotals
                  subtotal={cartSubtotal}
                  taxLines={cartTaxSummary.lines}
                  taxTotal={cartTaxSummary.taxTotal}
                  total={orderTotal}
                />
                <Button
                  type="button"
                  className="mt-3 w-full"
                  size="md"
                  disabled={cart.length === 0}
                  onClick={openPayDialog}
                >
                  Pay now
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Take payment</DialogTitle>
            <DialogDescription>
              Order total: <span className="font-medium text-foreground">{formatMoney(orderTotal)}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <PosOrderTotals
              subtotal={cartSubtotal}
              taxLines={cartTaxSummary.lines}
              taxTotal={cartTaxSummary.taxTotal}
              total={orderTotal}
              size="sm"
            />
            <div className="grid gap-1">
              <Label>Payment method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => applyPaymentMethod((v ?? "CASH") as PaymentMethod)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "CASH" ? (
              <>
                <div className="grid gap-1">
                  <Label htmlFor="cash-tendered">Amount received</Label>
                  <MoneyInput
                    id="cash-tendered"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Change due</span>
                    <span className="font-semibold tabular-nums">
                      {Number.isFinite(tenderedAmount) && tenderedAmount >= orderTotal
                        ? formatMoney(cashChange)
                        : "—"}
                    </span>
                  </div>
                  {Number.isFinite(tenderedAmount) && tenderedAmount < orderTotal ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      Amount received is less than the total.
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                {channelsForMethod.length > 0 ? (
                  <div className="grid gap-1">
                    <Label>Payment channel</Label>
                    <Select
                      value={paymentChannelId || undefined}
                      onValueChange={(v) => setPaymentChannelId(v ?? "")}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select account or MoMo line" />
                      </SelectTrigger>
                      <SelectContent>
                        {channelsForMethod.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            {channelSelectLabel(ch)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No {paymentMethod === "BANK" ? "bank" : "mobile money"} channels configured.
                    Add them in Admin → Settings → Payment channels.
                  </p>
                )}
                <div className="grid gap-1">
                  <Label htmlFor="txn-ref">Transaction code / reference</Label>
                  <Input
                    id="txn-ref"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder={
                      paymentMethod === "BANK"
                        ? "e.g. bank transaction ID"
                        : "e.g. MoMo reference"
                    }
                    autoFocus={channelsForMethod.length === 0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Full order amount ({formatMoney(orderTotal)}) will be recorded for this payment.
                  </p>
                </div>
              </>
            )}

            {checkoutError ? <p className="text-sm text-red-500">{checkoutError}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPayOpen(false)} disabled={checkingOut}>
              Back
            </Button>
            <Button type="button" onClick={() => void confirmPayment()} disabled={!canConfirmPay || checkingOut}>
              {checkingOut ? "Processing…" : "Complete sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
