import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-silver/10 bg-card/50 backdrop-blur-sm mt-auto">
      <div className="w-full px-6 lg:px-12 py-12">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <img src={logo} alt="Leyl" className="h-10 w-10" />
              <span className="text-2xl font-serif font-bold text-gradient-silver">Leyl</span>
            </Link>
            <p className="text-sm text-silver-muted leading-relaxed">
              Gizli ilimler ve antik bilgeliğin buluştuğu profesyonel platform.
            </p>
            <div className="flex items-center gap-2 text-xs text-silver-muted">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Bilgelik Yolculuğu</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-silver mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/explore" className="text-silver-muted hover:text-silver transition-smooth">
                  Keşfet
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-silver-muted hover:text-silver transition-smooth">
                  Nasıl Çalışır
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-silver-muted hover:text-silver transition-smooth">
                  Hakkımızda
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-silver mb-4">Yasal</h3>
            <ul className="space-y-2 text-sm">
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
                <Link to="/production" className="text-silver-muted hover:text-silver transition-smooth">
                  Üretim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-silver mb-4">Destek</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/faq" className="text-silver-muted hover:text-silver transition-smooth">
                  Sık Sorulan Sorular
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-silver-muted hover:text-silver transition-smooth">
                  İletişim
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
