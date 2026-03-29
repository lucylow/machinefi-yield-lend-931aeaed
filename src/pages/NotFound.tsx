import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 py-12">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">Error 404</p>
      <h1 className="text-6xl sm:text-7xl font-bold gradient-text mb-4 tracking-tight">Lost signal</h1>
      <h2 className="text-xl font-semibold text-foreground mb-3">Page not found</h2>
      <p className="text-muted-foreground mb-10 max-w-md leading-relaxed">
        This path is not part of the MachineFi network. Check the URL or return to the home page.
      </p>
      <Button asChild className="btn-gradient rounded-full px-8 font-semibold text-primary-foreground border-0">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
};

export default NotFound;
