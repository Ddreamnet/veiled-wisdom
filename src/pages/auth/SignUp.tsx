import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { UserRole } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import logo from "@/assets/logo.png";
const teacherApplicationSchema = z.object({
  dateOfBirth: z.string().min(1, "Doğum tarihi gereklidir"),
  specialization: z
    .string()
    .trim()
    .min(3, "Uzmanlık alanı en az 3 karakter olmalıdır")
    .max(200, "Uzmanlık alanı en fazla 200 karakter olabilir"),
  education: z
    .string()
    .trim()
    .min(10, "Eğitim bilgisi en az 10 karakter olmalıdır")
    .max(500, "Eğitim bilgisi en fazla 500 karakter olabilir"),
  yearsOfExperience: z
    .number()
    .min(0, "Deneyim yılı 0 veya daha büyük olmalıdır")
    .max(70, "Lütfen geçerli bir deneyim yılı girin"),
  phone: z
    .string()
    .trim()
    .min(10, "Telefon numarası en az 10 karakter olmalıdır")
    .max(20, "Telefon numarası en fazla 20 karakter olabilir"),
});
export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Teacher application fields
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [education, setEducation] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [phone, setPhone] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate teacher application if role is teacher
    if (role === "teacher") {
      try {
        teacherApplicationSchema.parse({
          dateOfBirth,
          specialization,
          education,
          yearsOfExperience: Number(yearsOfExperience),
          phone,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({
            title: "Doğrulama Hatası",
            description: error.issues[0].message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
    }
    const teacherData =
      role === "teacher"
        ? {
            dateOfBirth,
            specialization,
            education,
            yearsOfExperience: Number(yearsOfExperience),
            phone,
          }
        : undefined;
    const result = await signUp(email, password, username, role, teacherData);
    if (!result.error) {
      if (role === "teacher") {
        // Hoca başvurusu - login sayfasına yönlendir
        navigate("/auth/sign-in");
        toast({
          title: "Başvurunuz Alındı",
          description: "Kayıt başvurunuz tamamlandı. Admin tarafından onaylanmanız bekleniyor.",
          duration: 7000,
        });
      } else {
        // Müşteri - login sayfasına yönlendir
        navigate("/auth/sign-in");
      }
    }
    setLoading(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 liquid-gradient">
      <Card className="w-full max-w-md glass-effect border-silver/20">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img src={logo} alt="Leyl" className="h-16 w-16" />
              <div className="absolute inset-0 bg-primary/30 blur-xl" />
            </div>
          </div>
          <CardTitle className="text-3xl font-serif text-center text-gradient-silver">Kayıt Ol</CardTitle>
          <CardDescription className="text-center text-silver-muted">Yeni hesap oluşturun</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-silver-muted">
                Kullanıcı Adı
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="glass-effect border-silver/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-silver-muted">
                E-posta
              </Label>
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
              <Label htmlFor="password" className="text-silver-muted">
                Şifre
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-effect border-silver/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-silver-muted">Hesap Türü</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="customer" id="customer" />
                  <Label htmlFor="customer" className="font-normal cursor-pointer text-silver-muted">
                    Danışan
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teacher" id="teacher" />
                  <Label htmlFor="teacher" className="font-normal cursor-pointer text-silver-muted">
                    Hoca (Onay gerektirir)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {role === "teacher" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-silver-muted">
                    Doğum Tarihi *
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    max={new Date().toISOString().split("T")[0]}
                    className="glass-effect border-silver/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-silver-muted">
                    Telefon *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="05XX XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={20}
                    className="glass-effect border-silver/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization" className="text-silver-muted">
                    Uzmanlık Alanı *
                  </Label>
                  <Input
                    id="specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                    maxLength={200}
                    className="glass-effect border-silver/20"
                    placeholder="Örn: Bakım, astroloji, vefk"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education" className="text-silver-muted">
                    Eğitim Bilgisi *
                  </Label>
                  <Textarea
                    id="education"
                    placeholder="Mezun olduğunuz okul ve bölüm bilgileri"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    required
                    rows={3}
                    maxLength={500}
                    className="glass-effect border-silver/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience" className="text-silver-muted">
                    Deneyim (Yıl) *
                  </Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    max="70"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    required
                    className="glass-effect border-silver/20"
                  />
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-silver-muted">
            Zaten hesabınız var mı?{" "}
            <Link to="/auth/sign-in" className="text-primary hover:text-primary/80 transition-smooth font-medium">
              Giriş Yap
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
