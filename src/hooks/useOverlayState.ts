import { useSearchParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect } from "react";

export type OverlayType = 
  | "components" 
  | "warbands" 
  | "players" 
  | "player-settings"
  | "player-messages"
  | "rules" 
  | "map" 
  | "narrative" 
  | "messages" 
  | "schedule" 
  | "settings"
  | "battles"
  | null;

interface UseOverlayStateReturn {
  activeOverlay: OverlayType;
  openOverlay: (overlay: OverlayType) => void;
  closeOverlay: () => void;
  isOverlayOpen: (overlay: OverlayType) => boolean;
}

/**
 * Hook to manage overlay state via URL query params
 * Enables deep-linking, browser back/forward, and refresh persistence
 */
export function useOverlayState(): UseOverlayStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const activeOverlay = (searchParams.get("overlay") as OverlayType) || null;

  const openOverlay = useCallback((overlay: OverlayType) => {
    if (overlay) {
      setSearchParams({ overlay }, { replace: false });
    } else {
      setSearchParams({}, { replace: false });
    }
  }, [setSearchParams]);

  const closeOverlay = useCallback(() => {
    // Use navigate with replace to properly handle browser history
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("overlay");
    setSearchParams(newParams, { replace: false });
  }, [searchParams, setSearchParams]);

  const isOverlayOpen = useCallback((overlay: OverlayType) => {
    return activeOverlay === overlay;
  }, [activeOverlay]);

  // Handle escape key to close overlay
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeOverlay) {
        closeOverlay();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeOverlay, closeOverlay]);

  return {
    activeOverlay,
    openOverlay,
    closeOverlay,
    isOverlayOpen,
  };
}

/**
 * Hook to track overlay tab state in memory (survives overlay close/reopen)
 */
export function useOverlayTabMemory(overlayName: string, defaultTab: string) {
  const storageKey = `overlay_tab_${overlayName}`;
  
  const getTab = useCallback(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(storageKey) || defaultTab;
    }
    return defaultTab;
  }, [storageKey, defaultTab]);

  const setTab = useCallback((tab: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, tab);
    }
  }, [storageKey]);

  return { getTab, setTab };
}
