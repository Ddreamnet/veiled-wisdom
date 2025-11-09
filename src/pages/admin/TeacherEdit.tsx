import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Profile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { AvatarUpload } from '@/components/AvatarUpload';
import { z } from 'zod';

const teacherProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: 'Kullanıcı adı en az 3 karakter olmalı' })
    .max(50, { message: 'Kullanıcı adı en fazla 50 karakter olabilir' }),
  bio: z
    .string()
    .max(500, { message: 'Biyografi en fazla 500 karakter olabilir' })
    .optional(),
});

type TeacherProfileForm = z.infer<typeof teacherProfileSchema>;

export default function TeacherEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<TeacherProfileForm>({
    username: '',
    bio: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof TeacherProfileForm, string>>>({});

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  const fetchProfile = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({
        title: 'Hata',
        description: 'Profil bulunamadı.',
        variant: 'destructive',
      });
      navigate('/admin/teachers');
      return;
    }

    setProfile(data);
    setFormData({
      username: data.username || '',
      bio: data.bio || '',
    });
    setAvatarUrl(data.avatar_url || '');
    setLoading(false);
  };

  const validateForm = (): boolean => {
    try {
      teacherProfileSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof TeacherProfileForm, string>> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof TeacherProfileForm] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Doğrulama Hatası',
        description: 'Lütfen formdaki hataları düzeltin.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const updateData = {
      username: formData.username.trim(),
      bio: formData.bio?.trim() || null,
      avatar_url: avatarUrl || null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Hata',
        description: 'Profil güncellenemedi.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    toast({
      title: 'Başarılı',
      description: 'Profil güncellendi.',
    });

    setSaving(false);
    navigate('/admin/teachers');
  };

  const handleInputChange = (field: keyof TeacherProfileForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (loading) {
    return (
      <div className="container py-12 max-w-2xl">
        <p className="text-center">Yükleniyor...</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="container py-12 max-w-2xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/admin/teachers')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri Dön
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Hoca Profilini Düzenle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username">
                Kullanıcı Adı <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                maxLength={50}
                className={errors.username ? 'border-destructive' : ''}
              />
              {errors.username && (
                <p className="text-sm text-destructive mt-1">{errors.username}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formData.username.length}/50 karakter
              </p>
            </div>

            <div>
              <Label className="mb-4 block">Avatar</Label>
              <div className="flex justify-center">
                <AvatarUpload
                  currentAvatarUrl={avatarUrl}
                  userId={id!}
                  onUploadComplete={setAvatarUrl}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Biyografi</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={6}
                maxLength={500}
                className={errors.bio ? 'border-destructive' : ''}
                placeholder="Hoca hakkında kısa bir açıklama yazın..."
              />
              {errors.bio && (
                <p className="text-sm text-destructive mt-1">{errors.bio}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formData.bio?.length || 0}/500 karakter
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/teachers')}
                className="flex-1"
              >
                İptal
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Profil Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kullanıcı ID:</span>
            <span className="font-mono text-xs">{profile.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kayıt Tarihi:</span>
            <span>
              {new Date(profile.created_at).toLocaleDateString('tr-TR')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Onay Durumu:</span>
            <span>
              {profile.is_teacher_approved ? (
                <span className="text-green-500">✓ Onaylı</span>
              ) : (
                <span className="text-muted-foreground">Onay Bekliyor</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
