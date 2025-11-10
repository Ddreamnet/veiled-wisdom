import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { AvatarUpload } from '@/components/AvatarUpload';
import { User, Shield, Trash2, Calendar, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user, signOut, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setUsername(data.username || '');
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || '');
    }
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Hata',
        description: 'Avatar güncellenemedi.',
        variant: 'destructive',
      });
    } else {
      setAvatarUrl(url);
      fetchProfile();
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username, bio })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Hata',
        description: 'Profil güncellenemedi.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Başarılı',
        description: 'Profiliniz güncellendi.',
      });
      fetchProfile();
    }
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Hata',
        description: 'Lütfen tüm alanları doldurun.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Hata',
        description: 'Şifreler eşleşmiyor.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Hata',
        description: 'Şifre en az 6 karakter olmalıdır.',
        variant: 'destructive',
      });
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: 'Hata',
        description: 'Şifre güncellenemedi.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Başarılı',
        description: 'Şifreniz güncellendi.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      toast({
        title: 'Hata',
        description: 'Hesap silinemedi.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Başarılı',
        description: 'Hesabınız silindi.',
      });
      await signOut();
      navigate('/');
    }
  };

  return (
    <div className="container py-8 md:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-serif text-gradient-silver mb-6 md:mb-8">Hesap Ayarları</h1>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass-effect border-silver/20">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Güvenlik</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Hesap</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="glass-effect border-silver/20">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-xl md:text-2xl">Profil Bilgileri</CardTitle>
                    <CardDescription>Profilinizi düzenleyin ve yönetin</CardDescription>
                  </div>
                  {role === 'teacher' && (
                    <Badge className="bg-gradient-primary text-primary-foreground border-0 shadow-glow gap-1.5 px-3 py-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span className="font-medium">Hoca</span>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {user && (
                  <div className="flex justify-center">
                    <AvatarUpload
                      currentAvatarUrl={avatarUrl}
                      userId={user.id}
                      onUploadComplete={handleAvatarUpload}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-silver-muted">E-posta</Label>
                  <Input 
                    id="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="glass-effect border-silver/20" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-silver-muted">Kullanıcı Adı</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-effect border-silver/20"
                    placeholder="Kullanıcı adınızı girin"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-silver-muted">Biyografi</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="glass-effect border-silver/20"
                    placeholder="Kendinizden bahsedin..."
                  />
                </div>
                
                <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="glass-effect border-silver/20">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Şifre Değiştir</CardTitle>
                <CardDescription>Hesabınızın güvenliği için güçlü bir şifre kullanın</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-silver-muted">Yeni Şifre</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-effect border-silver/20"
                    placeholder="En az 6 karakter"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-silver-muted">Şifre Tekrar</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-effect border-silver/20"
                    placeholder="Şifrenizi tekrar girin"
                  />
                </div>
                
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={passwordLoading}
                  className="w-full sm:w-auto"
                >
                  {passwordLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card className="glass-effect border-silver/20">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Hesap Bilgileri</CardTitle>
                <CardDescription>Hesabınız hakkında detaylı bilgiler</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-silver-muted">Hesap ID</Label>
                  <p className="text-sm glass-effect border-silver/20 rounded-md p-3 break-all">
                    {user?.id}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-silver-muted">Kayıt Tarihi</Label>
                  <p className="text-sm glass-effect border-silver/20 rounded-md p-3">
                    {profile?.created_at ? format(new Date(profile.created_at), 'dd MMMM yyyy, HH:mm') : 'Bilinmiyor'}
                  </p>
                </div>

                {profile?.is_teacher_approved && (
                  <div className="space-y-2">
                    <Label className="text-silver-muted">Öğretmen Durumu</Label>
                    <p className="text-sm glass-effect border-silver/20 rounded-md p-3 text-green-400">
                      ✓ Onaylanmış Öğretmen
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-effect border-red-500/20">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl text-red-400">Tehlikeli Bölge</CardTitle>
                <CardDescription>Bu işlemler geri alınamaz</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto gap-2">
                      <Trash2 className="w-4 h-4" />
                      Hesabı Sil
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-effect border-silver/20">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hesabınızı silmek istediğinizden emin misiniz?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600">
                        Hesabı Sil
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
