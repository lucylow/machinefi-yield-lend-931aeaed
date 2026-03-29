import React from "react";
import { useLocation } from "react-router-dom";
import { DeFiAppShell } from "@/components/shell/DeFiAppShell";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  if (isLanding) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30">
        {children}
      </div>
    );
  }

  return <DeFiAppShell>{children}</DeFiAppShell>;
};

export default Layout;
