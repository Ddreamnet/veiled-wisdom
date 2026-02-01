import { UserRole } from "@/lib/supabase";

export type NavItem = {
  label: string;
  href: string;
};

export function getCenterNavItems(role: UserRole | null): NavItem[] {
  if (role === "admin") {
    return [
      { label: "Dashboard", href: "/admin/dashboard" },
      { label: "Onaylamalar", href: "/admin/approvals" },
      { label: "Gelirler", href: "/admin/earnings" },
    ];
  }
  // For non-logged-in users, customers, and teachers
  return [
    { label: "Keşfet", href: "/explore" },
    { label: "Uzmanlarımız", href: "/experts" },
  ];
}
