import { useState, useCallback } from "react";
import { supabase, Profile } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";

export function useProfileData(userId: string | undefined, userEmail: string | undefined, userMetadata: any) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error);
      toast({
        title: "Hata",
        description: "Profil bilgileri yüklenemedi.",
        variant: "destructive",
      });
      setDataLoading(false);
      return;
    }

    if (!data) {
      const fallbackUsername =
        (userMetadata && (userMetadata.username || userMetadata.full_name)) ||
        userEmail?.split("@")[0] ||
        "";
      const { data: created, error: upsertErr } = await supabase
        .from("profiles")
        .upsert({ id: userId, username: fallbackUsername, bio: "", avatar_url: null }, { onConflict: "id" })
        .select("*")
        .maybeSingle();

      if (upsertErr) {
        console.error("Profile auto-create error:", upsertErr);
        toast({
          title: "Hata",
          description: "Profil kaydı oluşturulamadı.",
          variant: "destructive",
        });
        setDataLoading(false);
        return;
      }

      if (created) {
        setProfile(created);
        setUsername(created.username || "");
        setBio(created.bio || "");
        setAvatarUrl(created.avatar_url || "");
      }

      setDataLoading(false);
      return;
    }

    setProfile(data);
    setUsername(data.username || "");
    setBio(data.bio || "");
    setAvatarUrl(data.avatar_url || "");
    setDataLoading(false);
  }, [userId, userEmail, userMetadata, toast]);

  const handleAvatarUpload = useCallback(async (url: string) => {
    if (!userId) return;

    const { error } = await supabase.from("profiles").upsert({ id: userId, avatar_url: url }, { onConflict: "id" });

    if (error) {
      console.error("Avatar update error:", error);
      toast({
        title: "Hata",
        description: `Avatar güncellenemedi: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Avatar güncellendi.",
      });
      await fetchProfile();
    }
  }, [userId, toast, fetchProfile]);

  const handleSave = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({ id: userId, username, bio }, { onConflict: "id" });

    if (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Hata",
        description: `Profil güncellenemedi: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Profiliniz güncellendi.",
      });
      await fetchProfile();
    }
    setLoading(false);
  }, [userId, username, bio, toast, fetchProfile]);

  return {
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
  };
}
