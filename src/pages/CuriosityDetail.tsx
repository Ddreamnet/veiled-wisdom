import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Curiosity } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

export default function CuriosityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [curiosity, setCuriosity] = useState<Curiosity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchCuriosity();
    }
  }, [slug]);

  const fetchCuriosity = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('curiosities')
      .select('*')
      .eq('slug', slug)
      .single();

    if (data) {
      setCuriosity(data);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container py-12 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-64 w-full mb-8" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  if (!curiosity) {
    return (
      <div className="container py-12 max-w-4xl">
        <p className="text-center text-muted-foreground">Yazı bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-4xl">
      <Link to="/">
        <Button variant="ghost" className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Ana Sayfaya Dön
        </Button>
      </Link>

      <article>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">{curiosity.title}</h1>
        
        <div className="text-sm text-muted-foreground mb-8">
          {new Date(curiosity.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>

        {curiosity.cover_url && (
          <img
            src={curiosity.cover_url}
            alt={curiosity.title}
            className="w-full h-96 object-cover rounded-lg mb-8 shadow-elegant"
          />
        )}

        <Card>
          <CardContent className="p-8">
            <div className="prose prose-lg max-w-none">
              {curiosity.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
