import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarUpload } from "@/components/AvatarUpload";
import {
  User,
  Shield,
  GraduationCap,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { MobileMenuItem } from "../types";

interface MobileProfileProps {
  userId: string;
  userEmail: string;
  role: string | null;
  username: string;
  setUsername: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  avatarUrl: string;
  dataLoading: boolean;
  loading: boolean;
  menuItems: MobileMenuItem[];
  onAvatarUpload: (url: string) => void;
  onSave: () => void;
  onSignOut: () => void;
}

export function MobileProfile({
  userId,
  userEmail,
  role,
  username,
  setUsername,
  bio,
  setBio,
  avatarUrl,
  dataLoading,
  loading,
  menuItems,
  onAvatarUpload,
  onSave,
  onSignOut,
}: MobileProfileProps) {
  const [showMobileEdit, setShowMobileEdit] = useState(false);

  return (
    <div className="container py-6 px-4 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Profile Header */}
        <div className="relative flex flex-col items-center text-center space-y-4">
          {/* Role Badge - Top Right */}
          {!dataLoading && role === "teacher" && (
            <Badge className="absolute top-0 right-0 bg-gradient-primary text-primary-foreground border-0 shadow-glow gap-1 px-2 py-0.5 text-xs">
              <GraduationCap className="w-3 h-3" />
              Uzman
            </Badge>
          )}
          {!dataLoading && role === "admin" && (
            <Badge className="absolute top-0 right-0 bg-secondary text-secondary-foreground border-0 gap-1 px-2 py-0.5 text-xs">
              <Shield className="w-3 h-3" />
              Admin
            </Badge>
          )}

          {dataLoading ? (
            <>
              <Skeleton variant="shimmer" className="h-24 w-24 rounded-full" />
              <Skeleton variant="shimmer" className="h-6 w-32" />
              <Skeleton variant="shimmer" className="h-4 w-48" />
            </>
          ) : (
            <>
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                userId={userId}
                onUploadComplete={onAvatarUpload}
              />
              <div>
                <h2 className="text-xl font-semibold text-foreground">{username || "Kullanıcı"}</h2>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </>
          )}
        </div>

        {/* Profile Edit Section - Collapsible */}
        <div className="space-y-2">
          <button
            onClick={() => setShowMobileEdit(!showMobileEdit)}
            className="w-full flex items-center justify-between p-4 rounded-xl glass-effect border border-silver/10 hover:border-silver/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                <User className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Profil Bilgileri</p>
                <p className="text-xs text-muted-foreground">Profil bilgilerinizi düzenleyin</p>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-muted-foreground group-hover:text-foreground transition-all ${showMobileEdit ? "rotate-90" : ""}`}
            />
          </button>

          {/* Expanded Edit Form */}
          {showMobileEdit && (
            <div className="p-4 rounded-xl glass-effect border border-silver/10 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile-username" className="text-silver-muted">
                  Kullanıcı Adı
                </Label>
                <Input
                  id="mobile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-effect border-silver/20"
                  placeholder="Kullanıcı adınızı girin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile-bio" className="text-silver-muted">
                  Biyografi
                </Label>
                <Textarea
                  id="mobile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="glass-effect border-silver/20"
                  placeholder="Kendinizden bahsedin..."
                />
              </div>

              <Button onClick={onSave} disabled={loading} className="w-full">
                {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center justify-between p-4 rounded-xl glass-effect border border-silver/10 hover:border-silver/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </div>

        {/* Sign Out Button */}
        <Button
          variant="outline"
          className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={onSignOut}
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}
