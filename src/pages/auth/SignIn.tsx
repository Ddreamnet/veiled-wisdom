import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/logo.webp';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (!error) {
      navigate('/');
    }
    
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 liquid-gradient -z-10" />
      <div className="flex items-center justify-center p-4 min-h-full">
      <Card className="w-full max-w-md glass-effect border-silver/20">
        <CardHeader className="space-y-2 md:space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img src={logo} alt="Leyl" className="h-12 w-12 md:h-16 md:w-16" />
              <div className="absolute inset-0 bg-primary/30 blur-xl" />
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-serif text-center text-gradient-silver uppercase">GİRİŞ YAP</CardTitle>
          <CardDescription className="text-center text-silver-muted">
            Hesabınıza giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-silver-muted">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-effect border-silver/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-silver-muted">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-effect border-silver/20"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-silver-muted">
            Hesabınız yok mu?{' '}
            <Link to="/auth/sign-up" className="text-primary hover:text-primary/80 transition-smooth font-medium">
              Kayıt Ol
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
