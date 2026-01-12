import { useEffect, useState } from "react";
import { supabase, UserRole } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
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
import { Users as UsersIcon, Shield, GraduationCap, User, CheckCircle, XCircle, Clock, AlertTriangle, Wrench, Mail, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserData = {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  created_at: string;
  teacher_status?: "pending" | "approved" | "rejected" | null;
  hasRoleIssue?: boolean;
  hasMissingRole?: boolean;
  hasMissingProfile?: boolean;
  hasProfile?: boolean;
  hasRole?: boolean;
  hasApproval?: boolean;
};

export default function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [repairingAll, setRepairingAll] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users from profiles/roles/approvals tables
  const fetchUsers = async () => {
    setLoading(true);
    try {
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

      const allUserIds = new Set<string>();
      profiles.forEach((p) => allUserIds.add(p.id));
      roles.forEach((r) => allUserIds.add(r.user_id));
      approvals.forEach((a) => allUserIds.add(a.user_id));

      const profilesMap = new Map(profiles.map((p) => [p.id, p]));
      const rolesMap = new Map(roles.map((r) => [r.user_id, r]));
      const approvalsMap = new Map(approvals.map((a) => [a.user_id, a]));

      const usersData: UserData[] = Array.from(allUserIds).map((userId) => {
        const profile = profilesMap.get(userId);
        const userRole = rolesMap.get(userId);
        const approval = approvalsMap.get(userId);

        const username = profile?.username || approval?.full_name || null;
        const created_at = profile?.created_at || approval?.created_at || new Date().toISOString();

        const hasRoleIssue = approval?.status === "approved" && userRole?.role !== "teacher";
        const hasMissingRole = !userRole;
        const hasMissingProfile = !profile;

        return {
          id: userId,
          email: null,
          username,
          avatar_url: profile?.avatar_url || null,
          role: userRole?.role || null,
          created_at,
          teacher_status: approval?.status || null,
          hasRoleIssue,
          hasMissingRole,
          hasMissingProfile,
          hasProfile: !!profile,
          hasRole: !!userRole,
          hasApproval: !!approval,
        };
      });

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

  // Repair a single user
  const handleRepairUser = async (user: UserData) => {
    setRepairing(user.id);
    try {
      // Step 1: Create profile if missing
      if (user.hasMissingProfile) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            username: user.username || user.email?.split("@")[0] || "Kullanıcı",
            is_teacher_approved: user.teacher_status === "approved",
          },
          { onConflict: "id" }
        );

        if (profileError) {
          console.error("Profile creation error:", profileError);
          throw new Error("Profil oluşturulamadı: " + profileError.message);
        }
      }

      // Step 2: Determine target role and assign
      let targetRole: UserRole = "customer";
      
      if (user.teacher_status === "approved") {
        targetRole = "teacher";
      } else if (user.role) {
        targetRole = user.role;
      }

      // Delete existing roles first
      await supabase.from("user_roles").delete().eq("user_id", user.id);

      // Insert correct role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: targetRole });

      if (roleError) throw roleError;

      // Step 3: Update profile if teacher
      if (targetRole === "teacher") {
        await supabase.from("profiles").update({ is_teacher_approved: true }).eq("id", user.id);
      }

      toast({
        title: "Başarılı",
        description: `${user.username || user.email || "Kullanıcı"} onarıldı. Rol: ${getRoleLabel(targetRole)}`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Repair error:", error);
      toast({
        title: "Hata",
        description: error.message || "Onarım başarısız oldu.",
        variant: "destructive",
      });
    } finally {
      setRepairing(null);
    }
  };

  // Repair all users with any issues
  const handleRepairAll = async () => {
    const usersWithIssues = users.filter((u) => u.hasRoleIssue || u.hasMissingRole || u.hasMissingProfile);
    if (usersWithIssues.length === 0) return;

    setRepairingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithIssues) {
      try {
        if (user.hasMissingProfile) {
          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              id: user.id,
              username: user.username || user.email?.split("@")[0] || "Kullanıcı",
              is_teacher_approved: user.teacher_status === "approved",
            },
            { onConflict: "id" }
          );

          if (profileError) throw profileError;
        }

        let targetRole: UserRole = "customer";
        if (user.teacher_status === "approved") {
          targetRole = "teacher";
        } else if (user.role) {
          targetRole = user.role;
        }

        await supabase.from("user_roles").delete().eq("user_id", user.id);

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: targetRole });

        if (roleError) throw roleError;

        if (targetRole === "teacher") {
          await supabase.from("profiles").update({ is_teacher_approved: true }).eq("id", user.id);
        }

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

  const handleDeleteUser = (user: UserData) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Oturum bulunamadı");
      }

      const response = await supabase.functions.invoke("delete-user", {
        body: { user_id: selectedUser.id },
      });

      if (response.error) {
        throw new Error(response.error.message || "Kullanıcı silinemedi");
      }

      toast({
        title: "Başarılı",
        description: `${selectedUser.username || "Kullanıcı"} başarıyla silindi.`,
      });

      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Hata",
        description: error.message || "Kullanıcı silinemedi.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
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

  const getStatusIndicator = (user: UserData) => {
    if (!user.hasProfile && !user.hasRole) {
      return (
        <Badge variant="destructive" className="text-xs">
          Hiç Yok
        </Badge>
      );
    }
    if (user.hasMissingProfile) {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
          Profil Eksik
        </Badge>
      );
    }
    if (user.hasMissingRole) {
      return (
        <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
          Rol Eksik
        </Badge>
      );
    }
    if (user.hasRoleIssue) {
      return (
        <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
          Rol Tutarsız
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs border-green-500 text-green-500">
        Tam
      </Badge>
    );
  };

  const filterUsersByRole = (role: UserRole | "all") => {
    if (role === "all") return users;
    return users.filter((u) => u.role === role);
  };

  const usersWithIssues = users.filter((u) => u.hasRoleIssue || u.hasMissingRole || u.hasMissingProfile);

  const renderUsersTable = (filteredUsers: UserData[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kullanıcı</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Uzman Durumu</TableHead>
          <TableHead>Kayıt Tarihi</TableHead>
          <TableHead>İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredUsers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Kullanıcı bulunamadı
            </TableCell>
          </TableRow>
        ) : (
          filteredUsers.map((user) => {
            const needsRepair = user.hasRoleIssue || user.hasMissingRole || user.hasMissingProfile;
            return (
            <TableRow key={user.id} className={needsRepair ? "bg-amber-500/10" : ""}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.username || "İsimsiz"}</span>
                    {user.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{getStatusIndicator(user)}</TableCell>
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
                  {needsRepair && (
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDeleteUser(user)}
                    className="text-destructive hover:bg-destructive/10 border-destructive/50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Sil
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )})
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
        <div className="flex items-center justify-between flex-wrap gap-4">
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


      {/* User Issues Warning */}
      {usersWithIssues.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {usersWithIssues.length} kullanıcıda sorun tespit edildi
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bu kullanıcılarda eksik profil, eksik rol veya tutarsızlık var.
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

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                <strong>{selectedUser?.username || "İsimsiz"}</strong> kullanıcısını silmek üzeresiniz.
              </p>
              <p className="text-destructive font-medium">
                Bu işlem geri alınamaz! Kullanıcının tüm verileri (profil, ilanlar, mesajlar, randevular vb.) kalıcı olarak silinecektir.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Siliniyor..." : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
