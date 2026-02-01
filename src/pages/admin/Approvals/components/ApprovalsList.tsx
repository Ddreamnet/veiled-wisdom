import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalCard } from "./ApprovalCard";
import type { TeacherApproval } from "../types";

interface ApprovalsListProps {
  pendingApprovals: TeacherApproval[];
  approvedApprovals: TeacherApproval[];
  rejectedApprovals: TeacherApproval[];
  loading: boolean;
  repairing: string | null;
  dataLoading: boolean;
  onRepair: (approval: TeacherApproval) => void;
  onApproval: (approvalId: string, userId: string, approve: boolean) => void;
}

export function ApprovalsList({
  pendingApprovals,
  approvedApprovals,
  rejectedApprovals,
  loading,
  repairing,
  dataLoading,
  onRepair,
  onApproval,
}: ApprovalsListProps) {
  if (dataLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="shimmer" className="h-10 w-full max-w-md" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Skeleton variant="shimmer" className="h-6 w-48 mb-2" />
              <Skeleton variant="shimmer" className="h-4 w-32" />
              <Skeleton variant="shimmer" className="h-4 w-full" />
              <Skeleton variant="shimmer" className="h-4 w-3/4" />
              <Skeleton variant="shimmer" className="h-4 w-2/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton variant="shimmer" className="h-9 w-24" />
                <Skeleton variant="shimmer" className="h-9 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="pending">Bekleyen ({pendingApprovals.length})</TabsTrigger>
        <TabsTrigger value="approved">Onaylanan ({approvedApprovals.length})</TabsTrigger>
        <TabsTrigger value="rejected">Reddedilen ({rejectedApprovals.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4 mt-6">
        {pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Bekleyen başvuru bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          pendingApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              showActions={true}
              loading={loading}
              repairing={repairing}
              onRepair={onRepair}
              onApproval={onApproval}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="approved" className="space-y-4 mt-6">
        {approvedApprovals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Onaylanmış başvuru bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          approvedApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              showActions={false}
              loading={loading}
              repairing={repairing}
              onRepair={onRepair}
              onApproval={onApproval}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="rejected" className="space-y-4 mt-6">
        {rejectedApprovals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Reddedilmiş başvuru bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          rejectedApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              showActions={false}
              loading={loading}
              repairing={repairing}
              onRepair={onRepair}
              onApproval={onApproval}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
