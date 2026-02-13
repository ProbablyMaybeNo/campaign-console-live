import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Fix: Import specific CSS entry to avoid Rollup resolution issues
import "@fontsource/unifrakturmaguntia/400.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initializeErrorReporting } from "./lib/errorReporter";

// Initialize global error handlers
initializeErrorReporting();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
