import { StaticPageLayout } from "@/components/StaticPageLayout";
import { CreditCard } from "lucide-react";

const defaultContent = `Leyl platformu, en yüksek güvenlik standartlarıyla geliştirilmiştir.

Tüm ödemeler güvenli altyapı üzerinden işlenir ve kullanıcı verileri korunur.

Platform sürekli olarak güncellenmekte ve geliştirilmektedir.`;

export default function Production() {
  return (
    <StaticPageLayout
      slug="production"
      defaultTitle="Ücretlendirme"
      defaultContent={defaultContent}
      icon={CreditCard}
    />
  );
}
