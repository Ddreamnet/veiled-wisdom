import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, Curiosity } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

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
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <Skeleton className="h-8 w-32 mb-6 md:mb-8" />
        <Skeleton className="h-10 md:h-12 w-3/4 mb-4" />
        <Skeleton className="h-48 md:h-64 w-full mb-6 md:mb-8" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  if (!curiosity) {
    return (
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <p className="text-center text-muted-foreground">Yazı bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb customItems={[
        { label: 'Merak Konuları' },
        { label: curiosity.title }
      ]} />

      <article>
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-4 md:mb-6">{curiosity.title}</h1>
        
        <div className="text-xs md:text-sm text-muted-foreground mb-6 md:mb-8">
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
            loading="lazy"
            decoding="async"
            className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-lg mb-6 md:mb-8 shadow-elegant"
          />
        )}

        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="prose prose-sm md:prose-lg max-w-none">
              {curiosity.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-3 md:mb-4 text-sm md:text-base text-foreground leading-relaxed">
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
