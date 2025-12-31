import { useEffect, useState } from "react";
import { supabase, UserRole } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users as UsersIcon, Shield, GraduationCap, User, CheckCircle, XCircle, Clock, AlertTriangle, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserData = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  created_at: string;
  teacher_status?: "pending" | "approved" | "rejected" | null;
  hasRoleIssue?: boolean; // Onaylı uzman ama rolü teacher değil
};

export default function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [repairingAll, setRepairingAll] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newRole, setNewRole] = useState<UserRole | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [profilesResult, rolesResult, approvalsResult] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("teacher_approvals").select("user_id, status, full_name, created_at"),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;
      if (approvalsResult.error) throw approvalsResult.error;

      const profiles = profilesResult.data || [];
      const roles = rolesResult.data || [];
      const approvals = approvalsResult.data || [];

      // Create a map of all unique user IDs from profiles, roles, and approvals
      const allUserIds = new Set<string>();
      profiles.forEach((p) => allUserIds.add(p.id));
      roles.forEach((r) => allUserIds.add(r.user_id));
      approvals.forEach((a) => allUserIds.add(a.user_id));

      // Create maps for quick lookup
      const profilesMap = new Map(profiles.map((p) => [p.id, p]));
      const rolesMap = new Map(roles.map((r) => [r.user_id, r]));
      const approvalsMap = new Map(approvals.map((a) => [a.user_id, a]));

      // Build user data for all unique users
      const usersData: UserData[] = Array.from(allUserIds).map((userId) => {
        const profile = profilesMap.get(userId);
        const userRole = rolesMap.get(userId);
        const approval = approvalsMap.get(userId);

        // Get username from profile, or from approval full_name
        const username = profile?.username || approval?.full_name || null;
        
        // Get created_at from profile, or from approval
        const created_at = profile?.created_at || approval?.created_at || new Date().toISOString();

        // Check if user has approved teacher status but wrong role
        const hasRoleIssue = approval?.status === "approved" && userRole?.role !== "teacher";

        return {
          id: userId,
          username,
          avatar_url: profile?.avatar_url || null,
          role: userRole?.role || null,
          created_at,
          teacher_status: approval?.status || null,
          hasRoleIssue,
        };
      });

      // Sort by created_at descending
      usersData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUsers(usersData);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Hata",
        description: "Kullanıcılar yüklenemedi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Repair a single user's role
  const handleRepairUser = async (user: UserData) => {
    setRepairing(user.id);
    try {
      // Delete existing roles
      await supabase.from("user_roles").delete().eq("user_id", user.id);

      // Insert teacher role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "teacher" });

      if (roleError) throw roleError;

      // Update profile
      await supabase.from("profiles").update({ is_teacher_approved: true }).eq("id", user.id);

      toast({
        title: "Başarılı",
        description: `${user.username || "Kullanıcı"} artık Uzman rolünde.`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Repair error:", error);
      toast({
        title: "Hata",
        description: "Rol düzeltilemedi.",
        variant: "destructive",
      });
    } finally {
      setRepairing(null);
    }
  };

  // Repair all users with role issues
  const handleRepairAll = async () => {
    const usersWithIssues = users.filter((u) => u.hasRoleIssue);
    if (usersWithIssues.length === 0) return;

    setRepairingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithIssues) {
      try {
        // Delete existing roles
        await supabase.from("user_roles").delete().eq("user_id", user.id);

        // Insert teacher role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "teacher" });

        if (roleError) throw roleError;

        // Update profile
        await supabase.from("profiles").update({ is_teacher_approved: true }).eq("id", user.id);

        successCount++;
      } catch (error) {
        console.error(`Error repairing user ${user.id}:`, error);
        errorCount++;
      }
    }

    toast({
      title: "Toplu Onarım Tamamlandı",
      description: `${successCount} kullanıcı düzeltildi${errorCount > 0 ? `, ${errorCount} hata oluştu` : ""}.`,
    });

    setRepairingAll(false);
    fetchUsers();
  };

  const handleRoleChange = (user: UserData) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    try {
      // Delete existing role
      await supabase.from("user_roles").delete().eq("user_id", selectedUser.id);

      // Insert new role
      const { error } = await supabase.from("user_roles").insert([{ user_id: selectedUser.id, role: newRole }]);

      if (error) throw error;

      // If changing to teacher, ensure they have an approved status
      if (newRole === "teacher") {
        const { data: existingApproval } = await supabase
          .from("teacher_approvals")
          .select("id")
          .eq("user_id", selectedUser.id)
          .maybeSingle();

        if (!existingApproval) {
          await supabase.from("teacher_approvals").insert([
            {
              user_id: selectedUser.id,
              status: "approved",
            },
          ]);
        } else {
          await supabase.from("teacher_approvals").update({ status: "approved" }).eq("user_id", selectedUser.id);
        }

        await supabase.from("profiles").update({ is_teacher_approved: true }).eq("id", selectedUser.id);
      }

      toast({
        title: "Başarılı",
        description: `Kullanıcı rolü ${getRoleLabel(newRole)} olarak güncellendi.`,
      });

      setShowRoleDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Hata",
        description: "Rol güncellenemedi.",
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: UserRole | null) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "teacher":
        return "Uzman";
      case "customer":
        return "Danışan";
      default:
        return "Rol Yok";
    }
  };

  const getRoleBadgeVariant = (role: UserRole | null) => {
    switch (role) {
      case "admin":
        return "default";
      case "teacher":
        return "secondary";
      case "customer":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: UserRole | null) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "teacher":
        return <GraduationCap className="w-4 h-4" />;
      case "customer":
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getTeacherStatusBadge = (status: string | null | undefined) => {
    if (!status) return null;

    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Onaylı
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Bekliyor
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Reddedildi
          </Badge>
        );
      default:
        return null;
    }
  };

  const filterUsersByRole = (role: UserRole | "all") => {
    if (role === "all") return users;
    return users.filter((u) => u.role === role);
  };

  // Count users with role issues
  const usersWithRoleIssues = users.filter((u) => u.hasRoleIssue);

  const renderUsersTable = (filteredUsers: UserData[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kullanıcı</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Uzman Durumu</TableHead>
          <TableHead>Kayıt Tarihi</TableHead>
          <TableHead>İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredUsers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Kullanıcı bulunamadı
            </TableCell>
          </TableRow>
        ) : (
          filteredUsers.map((user) => (
            <TableRow key={user.id} className={user.hasRoleIssue ? "bg-amber-500/10" : ""}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.username || "İsimsiz"}</span>
                    {user.hasRoleIssue && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Rol tutarsızlığı
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                  {getRoleIcon(user.role)}
                  {getRoleLabel(user.role)}
                </Badge>
              </TableCell>
              <TableCell>{getTeacherStatusBadge(user.teacher_status)}</TableCell>
              <TableCell>{new Date(user.created_at).toLocaleDateString("tr-TR")}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {user.hasRoleIssue && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRepairUser(user)}
                      disabled={repairing === user.id}
                      className="border-amber-500/50 hover:bg-amber-500/10"
                    >
                      <Wrench className="w-3 h-3 mr-1" />
                      {repairing === user.id ? "..." : "Onar"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleRoleChange(user)}>
                    Rol Değiştir
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <UsersIcon className="w-8 h-8" />
              Kullanıcı Yönetimi
            </h1>
            <p className="text-muted-foreground mt-2">Tüm kullanıcıları görüntüle ve yönet</p>
          </div>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Toplam Kullanıcı</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Role Issues Warning */}
      {usersWithRoleIssues.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {usersWithRoleIssues.length} kullanıcıda rol tutarsızlığı tespit edildi
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bu kullanıcılar onaylı uzman başvurusuna sahip ama rolleri "Uzman" olarak atanmamış.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRepairAll}
                disabled={repairingAll}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Wrench className="w-4 h-4 mr-2" />
                {repairingAll ? "Onarılıyor..." : "Tümünü Onar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tümü ({users.length})</TabsTrigger>
          <TabsTrigger value="admin">Admin ({filterUsersByRole("admin").length})</TabsTrigger>
          <TabsTrigger value="teacher">Uzman ({filterUsersByRole("teacher").length})</TabsTrigger>
          <TabsTrigger value="customer">Danışan ({filterUsersByRole("customer").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tüm Kullanıcılar</CardTitle>
            </CardHeader>
            <CardContent>{renderUsersTable(users)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Kullanıcılar</CardTitle>
            </CardHeader>
            <CardContent>{renderUsersTable(filterUsersByRole("admin"))}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teacher" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Uzman Kullanıcılar</CardTitle>
            </CardHeader>
            <CardContent>{renderUsersTable(filterUsersByRole("teacher"))}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Danışan Kullanıcılar</CardTitle>
            </CardHeader>
            <CardContent>{renderUsersTable(filterUsersByRole("customer"))}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Change Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcı Rolünü Değiştir</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedUser?.username || "İsimsiz"}</strong> kullanıcısının rolünü değiştirmek üzeresiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Yeni Rol</label>
            <Select value={newRole || undefined} onValueChange={(value) => setNewRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Rol seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="teacher">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Uzman
                  </div>
                </SelectItem>
                <SelectItem value="customer">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Danışan
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Güncelle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
