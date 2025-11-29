import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  '/admin': 'Admin Paneli',
  '/admin/dashboard': 'Dashboard',
  '/admin/approvals': 'Onaylamalar',
  '/admin/earnings': 'Gelirler',
  '/admin/teachers': 'Hocalar',
  '/admin/categories': 'Kategoriler',
  '/admin/pages': 'Sayfalar',
  '/admin/curiosities': 'Merak Konuları',
  '/admin/users': 'Kullanıcılar',
};

export function AdminBreadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[path] || segment;
    const isLast = index === pathSegments.length - 1;
    
    return { path, label, isLast };
  });

  return (
    <Breadcrumb className="mb-4 md:mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-smooth">
              <Home className="h-4 w-4" />
              <span>Ana Sayfa</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {breadcrumbItems.map((item, index) => (
          <div key={item.path} className="flex items-center gap-2">
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage className="text-foreground font-medium">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.path} className="text-muted-foreground hover:text-foreground transition-smooth">
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
