import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Sparkles } from "lucide-react";

const defaultContent = `Leyl, gizli ilimler ve antik bilgelik alanında uzmanlaşmış uzmanlar ile danışanları bir araya getiren modern bir platformdur.

Misyonumuz, kadim bilgelik ve modern teknolojinin buluştuğu bir köprü oluşturarak, insanların yaşamlarında anlam ve yön bulmalarına yardımcı olmaktır.

Uzman hocalarımız, bakım, temizleme, analiz ve astroloji gibi çeşitli alanlarda hizmet sunmaktadır.`;

export default function About() {
  const { data: page, isLoading } = useStaticPage("about");
  const content = page?.content || defaultContent;
  const title = page?.title || "Biz Kimiz";

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{title}</h1>
      </div>
      
      <DynamicPageContent content={content} isLoading={isLoading} />
    </div>
  );
}
