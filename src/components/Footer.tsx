import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm mt-auto relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-primary opacity-50" />
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-serif font-semibold text-lg mb-6 text-gradient">Kategoriler</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/categories/bakimlar" className="text-muted-foreground hover:text-primary-glow transition-smooth inline-block">
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
            <h3 className="font-serif font-semibold text-lg mb-6 text-gradient">Hakkımızda</h3>
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
            <h3 className="font-serif font-semibold text-lg mb-6 text-gradient">Destek</h3>
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
            <h3 className="font-serif font-semibold text-lg mb-6 text-gradient">Leyl</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Gizli ilimler platformu.<br />
              Antik bilgelik ve modern yaklaşımın buluşma noktası.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} <span className="font-serif text-gradient">Leyl</span>. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
