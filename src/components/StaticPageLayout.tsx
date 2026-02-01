import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";

interface StaticPageLayoutProps {
  slug: string;
  defaultTitle: string;
  defaultContent: string;
  icon?: LucideIcon;
  children?: ReactNode;
  renderCustomContent?: (content: string, isLoading: boolean) => ReactNode;
}

/**
 * Unified layout wrapper for static pages
 * Uses database-driven content with fallback defaults
 */
export function StaticPageLayout({
  slug,
  defaultTitle,
  defaultContent,
  icon: Icon,
  children,
  renderCustomContent,
}: StaticPageLayoutProps) {
  const { data: page, isLoading } = useStaticPage(slug);
  const content = page?.content || defaultContent;
  const title = page?.title || defaultTitle;

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        {Icon && <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary" />}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{title}</h1>
      </div>
      
      {renderCustomContent ? (
        renderCustomContent(content, isLoading)
      ) : children ? (
        children
      ) : (
        <DynamicPageContent content={content} isLoading={isLoading} />
      )}
    </div>
  );
}
