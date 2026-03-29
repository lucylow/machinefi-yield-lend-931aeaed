import React from "react";

/** Max-width shell for in-app pages (global navbar comes from `Layout`). */
const DappLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background text-foreground w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
    </div>
  );
};

export default DappLayout;
