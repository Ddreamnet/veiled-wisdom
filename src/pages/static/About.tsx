import { StaticPageLayout } from "@/components/StaticPageLayout";
import { Sparkles } from "lucide-react";

const defaultContent = `Leyl, gizli ilimler ve antik bilgelik alanında uzmanlaşmış uzmanlar ile danışanları bir araya getiren modern bir platformdur.

Misyonumuz, kadim bilgelik ve modern teknolojinin buluştuğu bir köprü oluşturarak, insanların yaşamlarında anlam ve yön bulmalarına yardımcı olmaktır.

Uzman hocalarımız, bakım, temizleme, analiz ve astroloji gibi çeşitli alanlarda hizmet sunmaktadır.`;

export default function About() {
  return (
    <StaticPageLayout
      slug="about"
      defaultTitle="Biz Kimiz"
      defaultContent={defaultContent}
      icon={Sparkles}
    />
  );
}
