import { memo } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { Facebook, Twitter, Instagram } from 'lucide-react';

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
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

          <div>
            {/* Social Media Icons */}
            <div className="flex gap-3 mb-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative p-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-300 hover:bg-primary/20 hover:border-primary/40 hover:scale-110"
              >
                <Facebook className="h-4 w-4 text-silver-muted group-hover:text-primary transition-colors duration-300" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative p-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-300 hover:bg-primary/20 hover:border-primary/40 hover:scale-110"
              >
                <Twitter className="h-4 w-4 text-silver-muted group-hover:text-primary transition-colors duration-300" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative p-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-300 hover:bg-primary/20 hover:border-primary/40 hover:scale-110"
              >
                <Instagram className="h-4 w-4 text-silver-muted group-hover:text-primary transition-colors duration-300" />
              </a>
            </div>

            {/* App Download Buttons */}
            <div className="space-y-2">
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-300 hover:bg-primary/20 hover:border-primary/40 hover:scale-105 group text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" fill="url(#google-play-gradient)"/>
                  <defs>
                    <linearGradient id="google-play-gradient" x1="3" y1="1.8" x2="21" y2="22.2" gradientUnits="userSpaceOnUse">
                      <stop stopColor="hsl(270, 80%, 60%)" />
                      <stop offset="1" stopColor="hsl(280, 90%, 70%)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-left">
                  <div className="text-xs text-silver-muted group-hover:text-silver transition-colors leading-tight">Google Play</div>
                </div>
              </a>

              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 backdrop-blur-sm border border-silver/10 transition-all duration-300 hover:bg-primary/20 hover:border-primary/40 hover:scale-105 group text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="hsl(var(--silver))"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs text-silver-muted group-hover:text-silver transition-colors leading-tight">App Store</div>
                </div>
              </a>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="relative w-full">
        <div className="w-full border-t border-silver/10 pt-8">
          <p className="text-sm text-silver-muted text-center">
            © {new Date().getFullYear()} Leyl. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
};

export const Footer = memo(FooterComponent);
