import { memo } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const FooterComponent = () => {
  return (
    <footer className="relative w-full border-t border-silver/10 bg-card/50 backdrop-blur-sm mt-auto overflow-hidden">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      
      {/* Wave Animation Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg className="absolute bottom-0 w-full h-32" preserveAspectRatio="none" viewBox="0 0 1200 120">
          <path 
            d="M0,0 C150,60 350,0 600,40 C850,80 1050,20 1200,60 L1200,120 L0,120 Z" 
            fill="url(#wave-gradient-1)"
            style={{ animation: 'wave 15s ease-in-out infinite' }}
          />
          <path 
            d="M0,20 C200,80 400,20 600,60 C800,100 1000,40 1200,80 L1200,120 L0,120 Z" 
            fill="url(#wave-gradient-2)"
            style={{ animation: 'wave-reverse 20s ease-in-out infinite' }}
            opacity="0.5"
          />
          <defs>
            <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(270, 80%, 60%)" stopOpacity="0.3" />
              <stop offset="50%" stopColor="hsl(280, 90%, 70%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(270, 80%, 60%)" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(280, 90%, 70%)" stopOpacity="0.2" />
              <stop offset="50%" stopColor="hsl(270, 80%, 60%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(280, 90%, 70%)" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative w-full py-12">
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="flex items-center justify-center">
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

      <div className="relative w-full">
        <div className="w-full border-t border-silver/10 pt-8">
          {/* Social Media Icons */}
          <div className="flex justify-center gap-6 mb-6">
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative p-3 rounded-full bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-500 hover:bg-primary/20 hover:border-primary/40 hover:scale-110 hover:shadow-glow"
            >
              <Facebook className="h-5 w-5 text-silver-muted group-hover:text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative p-3 rounded-full bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-500 hover:bg-primary/20 hover:border-primary/40 hover:scale-110 hover:shadow-glow"
            >
              <Twitter className="h-5 w-5 text-silver-muted group-hover:text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </a>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative p-3 rounded-full bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-500 hover:bg-primary/20 hover:border-primary/40 hover:scale-110 hover:shadow-glow"
            >
              <Instagram className="h-5 w-5 text-silver-muted group-hover:text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative p-3 rounded-full bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-500 hover:bg-primary/20 hover:border-primary/40 hover:scale-110 hover:shadow-glow"
            >
              <Linkedin className="h-5 w-5 text-silver-muted group-hover:text-primary transition-colors duration-300" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </a>
          </div>

          <p className="text-sm text-silver-muted text-center">
            © {new Date().getFullYear()} Leyl. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
};

export const Footer = memo(FooterComponent);
