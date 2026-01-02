import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { 
  User, 
  Bell, 
  Shield, 
  HelpCircle, 
  Mail, 
  Lock,
  FileText,
  MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences (placeholder state)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Hata",
        description: "Yeni şifreler eşleşmiyor.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Şifreniz güncellendi.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Şifre güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">
          Ayarları görüntülemek için giriş yapmalısınız.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ayarlar</h1>
        <p className="text-muted-foreground">Hesap ve uygulama tercihlerinizi yönetin.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="account" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Hesap</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Bildirimler</span>
          </TabsTrigger>
          <TabsTrigger 
            value="privacy" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Gizlilik</span>
          </TabsTrigger>
          <TabsTrigger 
            value="support" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Destek</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card className="glass-effect border-silver/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                E-posta Adresi
              </CardTitle>
              <CardDescription>Hesabınıza kayıtlı e-posta adresi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input 
                  value={user.email || ""} 
                  disabled 
                  className="bg-muted/50"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Değiştirilemez
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-silver/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Şifre Değiştir
              </CardTitle>
              <CardDescription>Hesap güvenliğiniz için şifrenizi güncelleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Yeni Şifre</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifrenizi girin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Şifre Tekrar</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar girin"
                />
              </div>
              <Button 
                onClick={handlePasswordChange} 
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="glass-effect border-silver/20">
            <CardHeader>
              <CardTitle>Bildirim Tercihleri</CardTitle>
              <CardDescription>Hangi bildirimleri almak istediğinizi seçin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label>E-posta Bildirimleri</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Önemli güncellemeler için e-posta alın
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label>Mesaj Bildirimleri</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Yeni mesaj geldiğinde bildirim alın
                  </p>
                </div>
                <Switch
                  checked={messageNotifications}
                  onCheckedChange={setMessageNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label>Randevu Hatırlatmaları</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Yaklaşan randevularınız için hatırlatma alın
                  </p>
                </div>
                <Switch
                  checked={appointmentReminders}
                  onCheckedChange={setAppointmentReminders}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Legal */}
        <TabsContent value="privacy" className="space-y-6">
          <Card className="glass-effect border-silver/20">
            <CardHeader>
              <CardTitle>Gizlilik & Yasal</CardTitle>
              <CardDescription>Yasal belgeler ve gizlilik politikaları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link 
                to="/privacy" 
                className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Gizlilik Politikası</p>
                    <p className="text-sm text-muted-foreground">Verilerinizi nasıl kullandığımızı öğrenin</p>
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
              
              <Separator />
              
              <Link 
                to="/terms" 
                className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Kullanım Koşulları</p>
                    <p className="text-sm text-muted-foreground">Hizmet şartlarımızı inceleyin</p>
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support */}
        <TabsContent value="support" className="space-y-6">
          <Card className="glass-effect border-silver/20">
            <CardHeader>
              <CardTitle>Yardım & Destek</CardTitle>
              <CardDescription>Sorularınız için yardım alın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link 
                to="/faq" 
                className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Sıkça Sorulan Sorular</p>
                    <p className="text-sm text-muted-foreground">En çok merak edilen konular</p>
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
              
              <Separator />
              
              <Link 
                to="/contact" 
                className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Bize Ulaşın</p>
                    <p className="text-sm text-muted-foreground">Destek ekibimizle iletişime geçin</p>
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
              
              <Separator />
              
              <Link 
                to="/how-it-works" 
                className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Nasıl Çalışır?</p>
                    <p className="text-sm text-muted-foreground">Platform hakkında bilgi edinin</p>
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
