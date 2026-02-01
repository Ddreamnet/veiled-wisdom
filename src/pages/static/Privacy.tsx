import { StaticPageLayout } from "@/components/StaticPageLayout";
import { Shield } from "lucide-react";

const defaultContent = `## 1. Veri Toplama
Platformumuz, kullanıcı deneyimini iyileştirmek için belirli verileri toplar.

## 2. Veri Kullanımı
Toplanan veriler yalnızca hizmet kalitesini artırmak için kullanılır.

## 3. Veri Güvenliği
Kullanıcı verileri en yüksek güvenlik standartlarıyla korunmaktadır.`;

export default function Privacy() {
  return (
    <StaticPageLayout
      slug="privacy"
      defaultTitle="Gizlilik Politikası"
      defaultContent={defaultContent}
      icon={Shield}
    />
  );
}
