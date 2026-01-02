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

const routeLabels: Record<string, string> = {
  "/": "Ana Sayfa",
  "/explore": "Kategorileri Keşfet",
  "/messages": "Mesajlar",
  "/appointments": "Randevularım",
  "/profile": "Profil",
  "/about": "Biz Kimiz",
  "/contact": "İletişim",
  "/faq": "SSS",
  "/how-it-works": "Nasıl Çalışır",
  "/privacy": "Gizlilik Politikası",
  "/terms": "Kullanım Koşulları",
  "/production": "Ücretlendirme",
  "/teacher": "Öğretmen",
  "/teacher/my-listings": "İlanlarım",
  "/teacher/earnings": "Kazançlarım",
};

interface PageBreadcrumbProps {
  customItems?: Array<{ label: string; href?: string }>;
}

export function PageBreadcrumb({ customItems }: PageBreadcrumbProps) {
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
    const label = routeLabels[path] || segment;
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

        {breadcrumbItems.map((item, index) => (
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
