import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="container py-8 md:py-12 px-4">
      <PageBreadcrumb customItems={[{ label: '404 - Sayfa Bulunamadı' }]} />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Aradığınız sayfa bulunamadı</p>
          <Link to="/" className="text-primary underline hover:text-primary/80 transition-smooth">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
