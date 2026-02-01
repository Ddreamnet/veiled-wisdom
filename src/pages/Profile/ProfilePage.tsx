import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Settings,
  MessageSquare,
  HelpCircle,
  FileText,
} from "lucide-react";
import { TurkishLiraIcon } from "@/components/icons/TurkishLiraIcon";
import { useProfileData, usePasswordChange } from "./hooks";
import { MobileProfile, DesktopProfile } from "./components";
import { MobileMenuItem } from "./types";

export default function ProfilePage() {
  const { user, signOut, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const {
    profile,
    username,
    setUsername,
    bio,
    setBio,
    avatarUrl,
    loading,
    dataLoading,
    fetchProfile,
    handleAvatarUpload,
    handleSave,
  } = useProfileData(user?.id, user?.email, user?.user_metadata);

  const {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordLoading,
    handlePasswordChange,
  } = usePasswordChange();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      toast({
        title: "Hata",
        description: "Hesap silinemedi.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Hesabınız silindi.",
      });
      await signOut();
      navigate("/");
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // Mobile Profile Hub Menu Items
  const getMobileMenuItems = (): MobileMenuItem[] => {
    const baseItems: MobileMenuItem[] = [
      { icon: Settings, label: "Ayarlar", href: "/settings", description: "Hesap ayarları ve tercihler" },
    ];

    if (role === "admin") {
      return [
        ...baseItems,
        { icon: HelpCircle, label: "Yardım", href: "/how-it-works", description: "Sık sorulan sorular" },
      ];
    }

    if (role === "teacher") {
      return [
        ...baseItems,
        { icon: FileText, label: "İlanlarım", href: "/teacher/my-listings", description: "İlanlarınızı yönetin" },
        { icon: TurkishLiraIcon, label: "Gelirlerim", href: "/teacher/earnings", description: "Gelir ve kazançlarınız" },
        { icon: HelpCircle, label: "Destek", href: "/how-it-works", description: "Sık sorulan sorular" },
      ];
    }

    return [
      ...baseItems,
      { icon: HelpCircle, label: "Destek", href: "/how-it-works", description: "Sık sorulan sorular" },
    ];
  };

  if (isMobile) {
    return (
      <MobileProfile
        userId={user?.id || ""}
        userEmail={user?.email || ""}
        role={role}
        username={username}
        setUsername={setUsername}
        bio={bio}
        setBio={setBio}
        avatarUrl={avatarUrl}
        dataLoading={dataLoading}
        loading={loading}
        menuItems={getMobileMenuItems()}
        onAvatarUpload={handleAvatarUpload}
        onSave={handleSave}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <DesktopProfile
      userId={user?.id || ""}
      userEmail={user?.email || ""}
      role={role}
      profile={profile}
      username={username}
      setUsername={setUsername}
      bio={bio}
      setBio={setBio}
      avatarUrl={avatarUrl}
      dataLoading={dataLoading}
      loading={loading}
      newPassword={newPassword}
      setNewPassword={setNewPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      passwordLoading={passwordLoading}
      onAvatarUpload={handleAvatarUpload}
      onSave={handleSave}
      onPasswordChange={handlePasswordChange}
      onDeleteAccount={handleDeleteAccount}
    />
  );
}
