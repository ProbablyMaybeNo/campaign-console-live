import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-xs text-primary font-mono uppercase tracking-widest">[ Error ]</p>
        <h1 className="text-5xl font-bold text-foreground font-mono">404</h1>
        <p className="text-sm text-muted-foreground">
          The route <code className="text-primary">{location.pathname}</code> could not be found.
        </p>
        <nav className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link to="/" className="text-sm text-primary underline hover:text-primary/80 transition-colors">
            Return Home
          </Link>
          <Link to="/auth" className="text-sm text-primary underline hover:text-primary/80 transition-colors">
            Sign In
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default NotFound;
