import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AvatarUpload } from '@/components/AvatarUpload';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

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

  return (
    <div className="container py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Hesabım</CardTitle>
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
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" value={user?.email || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Kullanıcı Adı</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Biyografi</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
