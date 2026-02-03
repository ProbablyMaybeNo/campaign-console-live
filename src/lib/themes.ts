import { Moon, Sun, Waves, Scroll, AlertTriangle, LucideIcon } from "lucide-react";

export interface Theme {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  supporterOnly: boolean;
}

export const THEMES: Theme[] = [
  { 
    id: "dark", 
    name: "Dark", 
    icon: Moon, 
    description: "Default terminal theme",
    supporterOnly: false 
  },
  { 
    id: "light", 
    name: "Light", 
    icon: Sun, 
    description: "Bright, clean interface",
    supporterOnly: true 
  },
  { 
    id: "aquatic", 
    name: "Aquatic", 
    icon: Waves, 
    description: "Deep teal with cyan accents",
    supporterOnly: true 
  },
  { 
    id: "parchment", 
    name: "Parchment", 
    icon: Scroll, 
    description: "Warm vintage aesthetic",
    supporterOnly: true 
  },
  { 
    id: "hazard", 
    name: "Hazard", 
    icon: AlertTriangle, 
    description: "Neon terminal style",
    supporterOnly: true 
  },
];

export function getThemeById(id: string): Theme | undefined {
  return THEMES.find(t => t.id === id);
}

export function isThemeLocked(themeId: string, isSupporter: boolean): boolean {
  const theme = getThemeById(themeId);
  if (!theme) return true;
  return theme.supporterOnly && !isSupporter;
}
