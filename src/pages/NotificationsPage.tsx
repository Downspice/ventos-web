import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardListSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/PageHeader";
import { useListPagination } from "@/hooks/useListPagination";
import { ListPagination } from "@/components/ListPagination";
import { PaginatedSection } from "@/components/PaginatedSection";

const Q = gql`
  query NotificationsPage {
    notifications {
      id
      title
      body
      readAt
      createdAt
    }
  }
`;

const READ = gql`
  mutation MarkRead($id: ID!) {
    markNotificationRead(id: $id) {
      id
      readAt
    }
  }
`;

export default function NotificationsPage() {
  const { data, loading, refetch } = useQuery<{
    notifications?: { id: string; title: string; body: string; readAt?: string; createdAt: string }[];
  }>(Q);
  const [markRead] = useMutation(READ);
  const notificationsPagination = useListPagination(data?.notifications ?? []);

  return (
    <div>
      <PageHeader title="Notifications" description="Alerts for stock, fraud, and system events." />
      <PaginatedSection
        fill="page"
        footer={
          !loading ? <ListPagination {...notificationsPagination.paginationProps} /> : null
        }
      >
        {loading ? (
          <CardListSkeleton rows={4} />
        ) : (
          <ul className="grid gap-3">
            {notificationsPagination.pageItems.map((n) => (
              <li key={n.id}>
                <Card className={n.readAt ? "opacity-70" : ""}>
                  <CardContent className="flex items-start justify-between gap-4 pt-6">
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.readAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void markRead({ variables: { id: n.id } }).then(() => refetch())}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PaginatedSection>
    </div>
  );
}
