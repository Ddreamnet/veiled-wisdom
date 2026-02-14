import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight, Home } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Combined route labels for all app areas
const routeLabels: Record<string, string> = {
  // Public routes
  "/": "Ana Sayfa",
  "/explore": "Kategorileri Keşfet",
  "/experts": "Uzmanlarımız",
  "/listings": "Tüm İlanlar",
  "/messages": "Mesajlar",
  "/appointments": "Randevularım",
  "/profile": "Profil",
  "/settings": "Ayarlar",
  
  // Static pages
  "/about": "Biz Kimiz",
  "/contact": "İletişim",
  "/faq": "SSS",
  "/how-it-works": "Nasıl Çalışır",
  "/privacy": "Gizlilik Politikası",
  "/terms": "Kullanım Koşulları",
  "/production": "Ücretlendirme",
  
  // Teacher routes
  "/teacher": "Öğretmen",
  "/teacher/my-listings": "İlanlarım",
  "/teacher/earnings": "Kazançlarım",
  
  // Admin routes
  "/admin": "Admin Paneli",
  "/admin/dashboard": "Dashboard",
  "/admin/approvals": "Onaylamalar",
  "/admin/earnings": "Gelirler",
  "/admin/teachers": "Uzmanları Düzenle",
  "/admin/categories": "Kategoriler",
  "/admin/pages": "Sayfalar",
  "/admin/curiosities": "Merak Konuları",
  "/admin/users": "Kullanıcı Yönetimi",
};

interface BreadcrumbProps {
  customItems?: Array<{ label: string; href?: string }>;
}

/**
 * Unified breadcrumb component for all pages
 * Supports both automatic path-based generation and custom items
 */
export function UnifiedBreadcrumb({ customItems }: BreadcrumbProps) {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Hide breadcrumbs on mobile completely
  if (isMobile) {
    return null;
  }

  // If custom items are provided, use them
  if (customItems && customItems.length > 0) {
    return (
      <Breadcrumb className="mb-4 md:mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-smooth"
              >
                <Home className="h-4 w-4" />
                <span>Ana Sayfa</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {customItems.map((item, index) => {
            const isLast = index === customItems.length - 1;
            return (
              <div key={index} className="flex items-center gap-2">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {isLast || !item.href ? (
                    <BreadcrumbPage className="text-foreground font-medium">{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={item.href} className="text-muted-foreground hover:text-foreground transition-smooth">
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Default breadcrumb based on current path
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) {
    return null; // No breadcrumb on home page
  }

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    
    // For dynamic routes (UUIDs), provide friendly labels
    let label = routeLabels[path] || segment;
    
    // If this is a UUID (e.g., teacher edit page), show appropriate label
    if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Check parent segment for context
      const parentPath = "/" + pathSegments.slice(0, index).join("/");
      if (parentPath === "/admin/teachers") {
        label = "Uzman Düzenle";
      } else if (parentPath === "/categories") {
        label = "Kategori";
      } else if (parentPath === "/listings") {
        label = "İlan Detayı";
      } else if (parentPath === "/profile") {
        label = "Profil";
      } else {
        label = "Detay";
      }
    }

    const isLast = index === pathSegments.length - 1;

    return { path, label, isLast };
  });

  return (
    <Breadcrumb className="mb-4 md:mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to="/"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-smooth"
            >
              <Home className="h-4 w-4" />
              <span>Ana Sayfa</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map((item) => (
          <div key={item.path} className="flex items-center gap-2">
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage className="text-foreground font-medium">{item.label}</BreadcrumbPage>
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

// Re-export with old names for backward compatibility
export { UnifiedBreadcrumb as PageBreadcrumb };
export { UnifiedBreadcrumb as AdminBreadcrumb };
