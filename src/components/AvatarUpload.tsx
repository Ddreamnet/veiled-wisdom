import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2 } from 'lucide-react';
import { uploadAvatar } from '@/lib/storage';
import { useImagePreload } from '@/hooks/useImagePreload';
type AvatarUploadProps = {
  currentAvatarUrl?: string | null;
  userId: string;
  onUploadComplete: (url: string) => void;
};
export function AvatarUpload({
  currentAvatarUrl,
  userId,
  onUploadComplete
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();

  // Preload current avatar
  useImagePreload(currentAvatarUrl ? [currentAvatarUrl] : []);
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload (pass current avatar URL to delete old one)
    setUploading(true);
    const {
      url,
      error
    } = await uploadAvatar(file, userId, currentAvatarUrl);
    if (error) {
      toast({
        title: 'Yükleme Hatası',
        description: error.message,
        variant: 'destructive'
      });
      setUploading(false);
      return;
    }
    if (url) {
      toast({
        title: 'Başarılı',
        description: 'Avatar başarıyla yüklendi.'
      });
      onUploadComplete(url);
    }
    setUploading(false);
  };
  return <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {previewUrl ? <img src={previewUrl} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-border" /> : <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border-4 border-border">
            <Upload className="h-12 w-12 text-muted-foreground" />
          </div>}
        {uploading && <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? 'Yükleniyor...' : 'Avatar Yükle'}
      </Button>

      
    </div>;
}