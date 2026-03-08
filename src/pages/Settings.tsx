import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";
import { 
  User, 
  Bell, 
  Shield, 
  HelpCircle, 
  Mail, 
  Lock,
  FileText,
  MessageSquare,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


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
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">Hesap ve uygulama tercihlerinizi yönetin.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto gap-1.5 bg-muted/50 p-1.5 rounded-xl border border-border/50">
          <TabsTrigger 
            value="account" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-primary/20 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
          >
            <User className="h-4 w-4 shrink-0" />
            <span>Hesap</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-primary/20 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span>Bildirimler</span>
          </TabsTrigger>
          <TabsTrigger 
            value="privacy" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-primary/20 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span>Gizlilik</span>
          </TabsTrigger>
          <TabsTrigger 
            value="support" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-primary/20 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span>Destek</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-4">
          <Card className="glass-effect border-silver/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                E-posta Adresi
              </CardTitle>
              <CardDescription className="text-xs">Hesabınıza kayıtlı e-posta adresi</CardDescription>
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-primary" />
                Şifre Değiştir
              </CardTitle>
              <CardDescription className="text-xs">Hesap güvenliğiniz için şifrenizi güncelleyin</CardDescription>
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
        <TabsContent value="notifications" className="space-y-4">
          <Card className="glass-effect border-silver/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bildirim Tercihleri</CardTitle>
              <CardDescription className="text-xs">Hangi bildirimleri almak istediğinizi seçin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">E-posta Bildirimleri</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
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
                    <Label className="text-sm">Mesaj Bildirimleri</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
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
                    <Label className="text-sm">Randevu Hatırlatmaları</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
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
        <TabsContent value="privacy" className="space-y-4">
          <Card className="glass-effect border-silver/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gizlilik & Yasal</CardTitle>
              <CardDescription className="text-xs">Yasal belgeler ve gizlilik politikaları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link 
                to="/privacy" 
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/50 hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Gizlilik Politikası</p>
                    <p className="text-xs text-muted-foreground">Verilerinizi nasıl kullandığımızı öğrenin</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              
              <Link 
                to="/terms" 
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/50 hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Kullanım Koşulları</p>
                    <p className="text-xs text-muted-foreground">Hizmet şartlarımızı inceleyin</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support */}
        <TabsContent value="support" className="space-y-4">
          <Card className="glass-effect border-silver/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Yardım & Destek</CardTitle>
              <CardDescription className="text-xs">Sorularınız için yardım alın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link 
                to="/faq" 
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/50 hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <HelpCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sıkça Sorulan Sorular</p>
                    <p className="text-xs text-muted-foreground">En çok merak edilen konular</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              
              <Link 
                to="/contact" 
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/50 hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Bize Ulaşın</p>
                    <p className="text-xs text-muted-foreground">Destek ekibimizle iletişime geçin</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              
              <Link 
                to="/how-it-works" 
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/50 hover:border-primary/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nasıl Çalışır?</p>
                    <p className="text-xs text-muted-foreground">Platform hakkında bilgi edinin</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
