import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { clearOutbox, enqueue, listOutbox } from "@/lib/offline-outbox";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";

const PENDING = gql`
  query SyncPending {
    syncQueuePending {
      id
      entityType
      entityId
      operation
    }
  }
`;

const PUSH = gql`
  mutation SyncPush($items: [SyncPushInput!]!) {
    syncPush(items: $items) {
      id
    }
  }
`;

const ACK = gql`
  mutation SyncAck($ids: [ID!]!) {
    syncAck(ids: $ids)
  }
`;

export default function SyncPage() {
  const [local, setLocal] = useState(listOutbox());
  const { data, refetch } = useQuery<{
    syncQueuePending?: { id: string; entityType: string; operation: string }[];
  }>(PENDING);
  const [syncPush] = useMutation(PUSH);
  const [syncAck] = useMutation(ACK);

  const localPagination = useListPagination(local);
  const pendingPagination = useListPagination(data?.syncQueuePending ?? []);

  function addDemo() {
    enqueue({
      entityType: "product",
      entityId: crypto.randomUUID(),
      operation: "CREATE",
      payload: { name: "Offline draft" },
      clientUpdatedAt: new Date().toISOString(),
    });
    setLocal(listOutbox());
  }

  async function flush() {
    const items = listOutbox();
    if (items.length === 0) return;
    const res = await syncPush({
      variables: {
        items: items.map((i) => ({
          entityType: i.entityType,
          entityId: i.entityId,
          operation: i.operation,
          payload: i.payload,
          clientUpdatedAt: i.clientUpdatedAt,
        })),
      },
    });
    const ids = (res.data as { syncPush?: { id: string }[] })?.syncPush?.map((x) => x.id) ?? [];
    if (ids.length) await syncAck({ variables: { ids } });
    clearOutbox(items.map((i) => i.id));
    setLocal(listOutbox());
    await refetch();
  }

  return (
    <div>
      <PageHeader title="Offline sync" description="Local outbox and server sync queue (stub)." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col pt-6">
            <PaginatedSection
              fill={false}
              footer={<ListPagination {...localPagination.paginationProps} />}
            >
              <h3 className="mb-2 text-sm font-medium">Local outbox</h3>
              <ul className="grid gap-1 text-xs">
                {localPagination.pageItems.map((i) => (
                  <li key={i.id}>
                    {i.operation} {i.entityType}/{i.entityId.slice(0, 8)}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={addDemo}>
                  Queue demo action
                </Button>
                <Button onClick={() => void flush()}>Push to server</Button>
              </div>
            </PaginatedSection>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col pt-6">
            <PaginatedSection
              fill={false}
              footer={<ListPagination {...pendingPagination.paginationProps} />}
            >
              <h3 className="mb-2 text-sm font-medium">Server pending</h3>
              <ul className="grid gap-1 text-xs">
                {pendingPagination.pageItems.map((i) => (
                  <li key={i.id}>
                    {i.operation} {i.entityType}
                  </li>
                ))}
              </ul>
            </PaginatedSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
