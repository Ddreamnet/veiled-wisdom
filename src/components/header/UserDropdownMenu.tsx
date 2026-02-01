import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings, BookOpen } from "lucide-react";
import { TurkishLiraIcon } from "@/components/icons/TurkishLiraIcon";
import { UserRole } from "@/lib/supabase";

interface UserDropdownMenuProps {
  avatarUrl: string | null;
  role: UserRole | null;
  onSignOut: () => void;
}

export function UserDropdownMenu({ avatarUrl, role, onSignOut }: UserDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9 p-0 transition-all duration-200 ease-out hover:ring-2 hover:ring-primary/50"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20">
              <User className="h-4 w-4 text-primary" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 glass-effect border-silver/20 bg-background/95 backdrop-blur-xl z-[100]"
      >
        {/* Common items for all logged-in users */}
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Profil
          </Link>
        </DropdownMenuItem>

        {/* Teacher-specific items */}
        {role === "teacher" && (
          <>
            <DropdownMenuSeparator className="bg-silver/10" />
            <DropdownMenuItem asChild>
              <Link to="/teacher/my-listings" className="flex items-center gap-2 cursor-pointer">
                <BookOpen className="h-4 w-4" />
                İlanlarım
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/teacher/earnings" className="flex items-center gap-2 cursor-pointer">
                <TurkishLiraIcon className="h-4 w-4" />
                Gelirlerim
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {/* Settings - Only for non-admin users */}
        {role !== "admin" && (
          <>
            <DropdownMenuSeparator className="bg-silver/10" />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Ayarlar
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-silver/10" />

        <DropdownMenuItem
          onClick={onSignOut}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
