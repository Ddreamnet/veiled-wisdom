import { StaticPageLayout } from "@/components/StaticPageLayout";
import { FileText } from "lucide-react";

const defaultContent = `## 1. Genel Hükümler
Bu platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.

## 2. Kullanıcı Sorumlulukları
Kullanıcılar, platform üzerinde gerçekleştirdikleri işlemlerden sorumludur.

## 3. Hizmet Şartları
Platform, hizmetlerini kesintisiz sunmayı hedefler ancak garanti vermez.`;

export default function Terms() {
  return (
    <StaticPageLayout
      slug="terms"
      defaultTitle="Kullanım Koşulları"
      defaultContent={defaultContent}
      icon={FileText}
    />
  );
}
