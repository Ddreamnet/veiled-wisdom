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
import { Users as UsersIcon, Shield, GraduationCap, User, CheckCircle, XCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserData = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  created_at: string;
  teacher_status?: "pending" | "approved" | "rejected" | null;
};

export default function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
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
      // Fetch all profiles with user roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("*");

      if (rolesError) throw rolesError;

      // Fetch teacher approvals
      const { data: approvals, error: approvalsError } = await supabase
        .from("teacher_approvals")
        .select("user_id, status");

      if (approvalsError) throw approvalsError;

      // Combine data
      const usersData: UserData[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        const approval = approvals?.find((a) => a.user_id === profile.id);

        return {
          id: profile.id,
          username: profile.username || null,
          avatar_url: profile.avatar_url || null,
          role: userRole?.role || null,
          created_at: profile.created_at,
          teacher_status: approval?.status || null,
        };
      });

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
        return "Öğrenci";
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
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.username || "İsimsiz"}</span>
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
                <Button variant="outline" size="sm" onClick={() => handleRoleChange(user)}>
                  Rol Değiştir
                </Button>
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

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tümü ({users.length})</TabsTrigger>
          <TabsTrigger value="admin">Admin ({filterUsersByRole("admin").length})</TabsTrigger>
          <TabsTrigger value="teacher">Uzman ({filterUsersByRole("teacher").length})</TabsTrigger>
          <TabsTrigger value="customer">Öğrenci ({filterUsersByRole("customer").length})</TabsTrigger>
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
              <CardTitle>Öğrenci Kullanıcılar</CardTitle>
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
                    Öğrenci
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
