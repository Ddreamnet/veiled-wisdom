import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

export function Footer() {
  return (
    <footer className="w-full border-t border-silver/10 bg-card/50 backdrop-blur-sm mt-auto">
      <div className="w-full px-6 lg:px-12 py-12">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-3 group">
              <img src={logo} alt="Leyl" className="h-10 w-10" />
              <span className="text-2xl font-serif font-bold text-gradient-silver">Leyl</span>
            </Link>
          </div>

          <div>
            <h3 className="font-semibold text-silver mb-4">Kategoriler</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/category/bakimlar" className="text-silver-muted hover:text-silver transition-smooth">
                  Bakımlar
                </Link>
              </li>
              <li>
                <Link to="/category/temizlemeler" className="text-silver-muted hover:text-silver transition-smooth">
                  Temizlemeler
                </Link>
              </li>
              <li>
                <Link to="/category/analizler" className="text-silver-muted hover:text-silver transition-smooth">
                  Analizler
                </Link>
              </li>
              <li>
                <Link to="/category/astroloji" className="text-silver-muted hover:text-silver transition-smooth">
                  Astroloji
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-silver mb-4">Hakkımızda</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-silver-muted hover:text-silver transition-smooth">
                  Biz Kimiz
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-silver-muted hover:text-silver transition-smooth">
                  Nasıl Çalışır
                </Link>
              </li>
              <li>
                <Link to="/production" className="text-silver-muted hover:text-silver transition-smooth">
                  Üretlendirme
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-silver-muted hover:text-silver transition-smooth">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-silver mb-4">Destek</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/contact" className="text-silver-muted hover:text-silver transition-smooth">
                  İletişim
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-silver-muted hover:text-silver transition-smooth">
                  Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-silver-muted hover:text-silver transition-smooth">
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-silver-muted hover:text-silver transition-smooth">
                  SSS
                </Link>
              </li>
            </ul>
          </div>
        </div>
        </div>
      </div>

      <div className="w-full px-6 lg:px-12">
        <div className="max-w-screen-2xl mx-auto border-t border-silver/10 pt-8 text-center">
          <p className="text-sm text-silver-muted">
            © {new Date().getFullYear()} Leyl. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
