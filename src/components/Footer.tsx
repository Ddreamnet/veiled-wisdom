import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Kategoriler</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/categories/bakimlar" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Bakımlar
                </Link>
              </li>
              <li>
                <Link to="/categories/temizlemeler" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Temizlemeler
                </Link>
              </li>
              <li>
                <Link to="/categories/analizler" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Analizler
                </Link>
              </li>
              <li>
                <Link to="/categories/astroloji" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Astroloji
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Hakkımızda</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Biz kimiz
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Nasıl çalışır
                </Link>
              </li>
              <li>
                <Link to="/production" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Üretlendirme
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-smooth">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Destek</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-smooth">
                  İletişim
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-smooth">
                  SSS
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Leyl</h3>
            <p className="text-muted-foreground text-sm">
              Gizli ilimler platformu. Tüm hakları saklıdır.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Leyl. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
