import { memo, ReactNode } from "react";
import { bottomNavPaddingStyle } from "@/lib/constants";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";

interface MobileLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  showBackButton?: boolean;
  hideBottomNav?: boolean;
}

const MobileLayoutComponent = ({ 
  children, 
  headerTitle, 
  showBackButton,
  hideBottomNav = false 
}: MobileLayoutProps) => {
  return (
    <div className="md:hidden min-h-screen flex flex-col">
      <MobileHeader title={headerTitle} showBackButton={showBackButton} />
      
      <main 
        className="flex-1"
        style={{ paddingBottom: bottomNavPaddingStyle }}
      >
        {children}
      </main>
      
      {!hideBottomNav && <MobileBottomNav />}
    </div>
  );
};

export const MobileLayout = memo(MobileLayoutComponent);
