import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { ApprovalsList } from "./components/ApprovalsList";
import { useApprovals } from "./hooks/useApprovals";

export default function ApprovalsPage() {
  const {
    pendingApprovals,
    approvedApprovals,
    rejectedApprovals,
    loading,
    repairing,
    dataLoading,
    handleRepair,
    handleApproval,
  } = useApprovals();

  // Count approvals needing repair
  const repairNeededCount = [...pendingApprovals, ...approvedApprovals, ...rejectedApprovals].filter(
    (a) => a.hasProfileIssue || a.hasRoleIssue,
  ).length;

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Uzman Başvuruları</h1>
          <div className="flex gap-2">
            {repairNeededCount > 0 && (
              <Badge
                variant="outline"
                className="text-base px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/30"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                {repairNeededCount} Onarım Gerekli
              </Badge>
            )}
            <Badge variant="secondary" className="text-base px-3 py-1">
              {pendingApprovals.length} Bekliyor
            </Badge>
          </div>
        </div>
      </div>

      <ApprovalsList
        pendingApprovals={pendingApprovals}
        approvedApprovals={approvedApprovals}
        rejectedApprovals={rejectedApprovals}
        loading={loading}
        repairing={repairing}
        dataLoading={dataLoading}
        onRepair={handleRepair}
        onApproval={handleApproval}
      />
    </div>
  );
}
