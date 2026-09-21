import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDrawer, NewButton } from "@/components/FormDrawer";
import { RecordViewDrawer, type RecordViewField } from "@/components/RecordViewDrawer";
import { TableRowActions } from "@/components/TableRowActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowsSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/PageHeader";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";
import { useState } from "react";
import { ProductWithImage } from "@/components/EntityImageField";

const Q = gql`
  query PurchasesPage {
    suppliers {
      id
      name
      email
      phone
      address
    }
    purchaseOrders {
      id
      supplierId
      status
      createdAt
    }
    stockTransfers {
      id
      status
      fromLocationId
      toLocationId
    }
    locations {
      id
      name
      isDefault
    }
    products {
      id
      name
      imageUrl
    }
    stockMovements(limit: 20) {
      id
      movementType
      quantityDelta
      productId
      createdAt
    }
  }
`;

const CREATE_SUPPLIER = gql`
  mutation CreateSupplier($name: String!, $email: String, $phone: String, $address: String) {
    createSupplier(name: $name, email: $email, phone: $phone, address: $address) {
      id
    }
  }
`;

const UPDATE_SUPPLIER = gql`
  mutation UpdateSupplier($id: ID!, $input: SupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_SUPPLIER = gql`
  mutation DeleteSupplier($id: ID!) {
    deleteSupplier(id: $id)
  }
`;

export default function PurchasesPage() {
  const { data, loading, refetch } = useQuery<{
    suppliers?: { id: string; name: string; email?: string; phone?: string; address?: string }[];
    purchaseOrders?: { id: string; supplierId: string; status: string; createdAt: string }[];
    stockTransfers?: { id: string; status: string; fromLocationId: string; toLocationId: string }[];
    locations?: { id: string; name: string; isDefault: boolean }[];
    products?: { id: string; name: string; imageUrl?: string | null }[];
    stockMovements?: {
      id: string;
      movementType: string;
      quantityDelta: number;
      productId: string;
      createdAt: string;
    }[];
  }>(Q);
  const [createSupplier] = useMutation(CREATE_SUPPLIER);
  const [updateSupplier] = useMutation(UPDATE_SUPPLIER);
  const [deleteSupplier] = useMutation(DELETE_SUPPLIER);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [viewSheet, setViewSheet] = useState<{
    title: string;
    fields: RecordViewField[];
    imageUrl?: string | null;
    imageAlt?: string;
  } | null>(null);

  function supplierVariables() {
    return {
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
    };
  }

  function resetSupplierForm() {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setEditSupplierId(null);
  }

  function openEditSupplier(s: { id: string; name: string; email?: string; phone?: string; address?: string }) {
    setEditSupplierId(s.id);
    setName(s.name);
    setEmail(s.email ?? "");
    setPhone(s.phone ?? "");
    setAddress(s.address ?? "");
  }

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (editSupplierId) {
      await updateSupplier({
        variables: { id: editSupplierId, input: supplierVariables() },
      });
    } else {
      await createSupplier({ variables: supplierVariables() });
    }
    resetSupplierForm();
    setDrawerOpen(false);
    await refetch();
  }

  const productById = (id: string) => data?.products?.find((p) => p.id === id);
  const productName = (id: string) => productById(id)?.name ?? id.slice(-6);

  const suppliersPagination = useListPagination(data?.suppliers ?? []);
  const ordersPagination = useListPagination(data?.purchaseOrders ?? []);
  const transfersPagination = useListPagination(data?.stockTransfers ?? []);
  const locationsPagination = useListPagination(data?.locations ?? []);
  const movementsPagination = useListPagination(data?.stockMovements ?? []);

  return (
    <div>
      <PageHeader
        title="Purchasing & stock"
        description="Suppliers, purchase orders, transfers, and movements."
        actions={<NewButton label="New supplier" onClick={() => setDrawerOpen(true)} />}
      />
      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) resetSupplierForm();
        }}
        title={editSupplierId ? "Edit supplier" : "New supplier"}
        description="Add a vendor for purchase orders."
        submitLabel={editSupplierId ? "Save changes" : "Create supplier"}
        onSubmit={addSupplier}
      >
        <div className="grid gap-1">
          <Label>Supplier name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-1">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label>Phone</Label>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label>Address</Label>
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
        </div>
      </FormDrawer>
      <RecordViewDrawer
        open={viewSheet != null}
        onOpenChange={(open) => {
          if (!open) setViewSheet(null);
        }}
        title={viewSheet?.title ?? "Record"}
        fields={viewSheet?.fields ?? []}
        imageUrl={viewSheet?.imageUrl}
        imageAlt={viewSheet?.imageAlt}
      />
      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="orders">Purchase orders</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers" className="mt-4">
          <PaginatedSection
            fill="page"
            footer={
              !loading ? <ListPagination {...suppliersPagination.paginationProps} /> : null
            }
          >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsSkeleton rows={5} cols={3} />
              ) : (
                suppliersPagination.pageItems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.email ?? "—"}</TableCell>
                  <TableCell>
                    <TableRowActions
                      onView={() =>
                        setViewSheet({
                          title: "Supplier",
                          fields: [
                            { label: "Name", value: s.name },
                            { label: "Email", value: s.email ?? "" },
                            { label: "Phone", value: s.phone ?? "" },
                            { label: "Address", value: s.address ?? "" },
                          ],
                        })
                      }
                      onEdit={() => {
                        openEditSupplier(s);
                        setDrawerOpen(true);
                      }}
                      onDelete={() =>
                        void deleteSupplier({ variables: { id: s.id } }).then(() => refetch())
                      }
                    />
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </PaginatedSection>
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <PaginatedSection
            fill="page"
            footer={
              !loading ? <ListPagination {...ordersPagination.paginationProps} /> : null
            }
          >
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRowsSkeleton rows={5} cols={4} />
                ) : (
                  ordersPagination.pageItems.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{po.status}</TableCell>
                    <TableCell>{po.supplierId.slice(-8)}</TableCell>
                    <TableCell>
                      <TableRowActions
                        onView={() =>
                          setViewSheet({
                            title: "Purchase order",
                            fields: [
                              { label: "Created", value: new Date(po.createdAt).toLocaleString() },
                              { label: "Status", value: po.status },
                              { label: "Supplier ID", value: po.supplierId },
                            ],
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </PaginatedSection>
        </TabsContent>
        <TabsContent value="transfers" className="mt-4">
          <PaginatedSection
            fill="page"
            footer={
              !loading ? <ListPagination {...transfersPagination.paginationProps} /> : null
            }
          >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsSkeleton rows={4} cols={4} />
              ) : (
                transfersPagination.pageItems.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.status}</TableCell>
                  <TableCell>{t.fromLocationId.slice(-8)}</TableCell>
                  <TableCell>{t.toLocationId.slice(-8)}</TableCell>
                  <TableCell>
                    <TableRowActions
                      onView={() =>
                        setViewSheet({
                          title: "Stock transfer",
                          fields: [
                            { label: "Status", value: t.status },
                            { label: "From location", value: t.fromLocationId },
                            { label: "To location", value: t.toLocationId },
                          ],
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </PaginatedSection>
        </TabsContent>
        <TabsContent value="locations" className="mt-4">
          <PaginatedSection
            fill="page"
            footer={
              !loading ? <ListPagination {...locationsPagination.paginationProps} /> : null
            }
          >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsSkeleton rows={4} cols={3} />
              ) : (
                locationsPagination.pageItems.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.name}</TableCell>
                  <TableCell>{l.isDefault ? "Yes" : "—"}</TableCell>
                  <TableCell>
                    <TableRowActions
                      onView={() =>
                        setViewSheet({
                          title: "Location",
                          fields: [
                            { label: "Name", value: l.name },
                            { label: "Default", value: l.isDefault ? "Yes" : "No" },
                          ],
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </PaginatedSection>
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <PaginatedSection
            fill="page"
            footer={
              !loading ? <ListPagination {...movementsPagination.paginationProps} /> : null
            }
          >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Δ</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsSkeleton rows={6} cols={5} />
              ) : (
                movementsPagination.pageItems.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{m.movementType}</TableCell>
                  <TableCell>
                    <ProductWithImage
                      name={productName(m.productId)}
                      imageUrl={productById(m.productId)?.imageUrl}
                    />
                  </TableCell>
                  <TableCell className="text-right">{m.quantityDelta}</TableCell>
                  <TableCell>
                    <TableRowActions
                      onView={() => {
                        const prod = productById(m.productId);
                        setViewSheet({
                          title: "Stock movement",
                          imageUrl: prod?.imageUrl,
                          imageAlt: prod?.name ?? "Product",
                          fields: [
                            { label: "When", value: new Date(m.createdAt).toLocaleString() },
                            { label: "Type", value: m.movementType },
                            { label: "Product", value: productName(m.productId) },
                            { label: "Quantity change", value: String(m.quantityDelta) },
                          ],
                        });
                      }}
                    />
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </PaginatedSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
