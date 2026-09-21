import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { AlertCircle, Home, Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--cream)] text-[var(--ink)] transition-colors duration-200 p-4">
      <Card className="w-full max-w-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
          </button>
        </div>

        <CardContent className="pt-10 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--rust)]/15 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-[var(--rust)]" />
            </div>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight font-display mb-2 text-[var(--ink)]">404</h1>

          <h2 className="text-xl font-semibold text-[var(--ink)] mb-4 font-mono">
            Page Not Found
          </h2>

          <p className="text-[var(--ink-soft)] mb-8 leading-relaxed text-sm max-w-sm mx-auto">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-[var(--ink)] text-[var(--cream)] hover:bg-[var(--rust)] px-6 py-2.5 rounded-md transition-all duration-200 font-mono text-xs uppercase tracking-wider"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

