import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, X } from 'lucide-react';
import { uploadListingImage } from '@/lib/storage';

type ImageUploadProps = {
  currentImageUrl?: string | null;
  listingId: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
};

export function ImageUpload({ 
  currentImageUrl, 
  listingId, 
  onUploadComplete,
  onRemove 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const { url, error } = await uploadListingImage(file, listingId);

    if (error) {
      toast({
        title: 'Yükleme Hatası',
        description: error.message,
        variant: 'destructive',
      });
      setUploading(false);
      return;
    }

    if (url) {
      toast({
        title: 'Başarılı',
        description: 'Görsel başarıyla yüklendi.',
      });
      onUploadComplete(url);
    }

    setUploading(false);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Ilan görseli"
            className="w-full h-64 object-cover rounded-lg border-2 border-border"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!uploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full h-64 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors">
          <Upload className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">İlan görseli yükle</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? 'Yükleniyor...' : previewUrl ? 'Görseli Değiştir' : 'Görsel Yükle'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG veya WEBP (Maks. 10MB)
      </p>
    </div>
  );
}
