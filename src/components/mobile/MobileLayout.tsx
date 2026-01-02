import { memo, ReactNode } from "react";
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
      
      {/* Main content with bottom padding to avoid nav overlap */}
      <main 
        className="flex-1 pb-24"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </main>
      
      {!hideBottomNav && <MobileBottomNav />}
    </div>
  );
};

export const MobileLayout = memo(MobileLayoutComponent);
