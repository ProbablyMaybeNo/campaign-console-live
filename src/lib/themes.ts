import { 
  Moon, 
  Monitor, 
  Apple, 
  Cpu, 
  Terminal, 
  HardDrive, 
  Gamepad2, 
  Square, 
  Sun, 
  Server,
  LucideIcon 
} from "lucide-react";

export type ThemeId =
  | "dark"
  | "win95"
  | "mac_platinum"
  | "amiga_workbench"
  | "vt320_amber"
  | "msdos_vga"
  | "atari_tos"
  | "nextstep"
  | "solaris_cde"
  | "sgi_irix";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  supporterOnly: boolean;
  preview: {
    background: string;  // HSL format: "h s% l%"
    card: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
  };
  fonts: {
    ui: string;
    mono: string;
  };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "dark",
    name: "Campaign Console",
    tagline: "Default terminal theme with neon green.",
    icon: Moon,
    supporterOnly: false,
    preview: {
      background: "0 0% 3%",
      card: "0 0% 8%",
      primary: "142 76% 55%",
      secondary: "195 100% 60%",
      accent: "0 0% 10%",
      border: "0 0% 48%",
    },
    fonts: {
      ui: "IBM Plex Mono, ui-monospace",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "win95",
    name: "Windows 95",
    tagline: "Teal desktop, gray chrome, navy action bar.",
    icon: Monitor,
    supporterOnly: true,
    preview: {
      background: "180 100% 25%",
      card: "0 0% 75%",
      primary: "240 100% 25%",
      secondary: "196 100% 40%",
      accent: "328 61% 30%",
      border: "0 0% 35%",
    },
    fonts: {
      ui: "IBM Plex Mono, Tahoma, system-ui",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "mac_platinum",
    name: "Mac Platinum",
    tagline: "Clean platinum with blue + lavender pop.",
    icon: Apple,
    supporterOnly: true,
    preview: {
      background: "0 0% 82%",
      card: "0 0% 94%",
      primary: "227 100% 45%",
      secondary: "254 60% 50%",
      accent: "180 100% 28%",
      border: "0 0% 35%",
    },
    fonts: {
      ui: "IBM Plex Mono, system-ui",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "amiga_workbench",
    name: "Amiga",
    tagline: "Deep blue with orange + cyan demo scene energy.",
    icon: Gamepad2,
    supporterOnly: true,
    preview: {
      background: "225 100% 15%",
      card: "225 60% 22%",
      primary: "33 100% 50%",
      secondary: "193 100% 50%",
      accent: "248 53% 58%",
      border: "0 0% 60%",
    },
    fonts: {
      ui: "IBM Plex Mono, system-ui",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "vt320_amber",
    name: "VT320 Amber",
    tagline: "Phosphor amber terminal with cyan links.",
    icon: Terminal,
    supporterOnly: true,
    preview: {
      background: "0 0% 0%",
      card: "0 0% 4%",
      primary: "41 100% 50%",
      secondary: "186 100% 50%",
      accent: "41 100% 22%",
      border: "43 100% 25%",
    },
    fonts: {
      ui: "IBM Plex Mono, ui-monospace",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "msdos_vga",
    name: "MS-DOS VGA",
    tagline: "VGA blue with bright DOS palette accents.",
    icon: HardDrive,
    supporterOnly: true,
    preview: {
      background: "240 100% 15%",
      card: "240 50% 20%",
      primary: "180 100% 50%",
      secondary: "300 100% 67%",
      accent: "60 100% 60%",
      border: "0 0% 60%",
    },
    fonts: {
      ui: "IBM Plex Mono, ui-monospace",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "atari_tos",
    name: "Atari TOS",
    tagline: "Darkened green desktop with neon arcade highlights.",
    icon: Cpu,
    supporterOnly: true,
    preview: {
      background: "140 60% 14%",
      card: "0 0% 92%",
      primary: "186 100% 40%",
      secondary: "300 100% 45%",
      accent: "54 100% 42%",
      border: "0 0% 35%",
    },
    fonts: {
      ui: "IBM Plex Mono, system-ui",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "nextstep",
    name: "NeXTSTEP",
    tagline: "Dark graphite with yellow accent bars + cyan.",
    icon: Square,
    supporterOnly: true,
    preview: {
      background: "220 5% 11%",
      card: "0 0% 14%",
      primary: "50 100% 50%",
      secondary: "191 100% 50%",
      accent: "25 100% 50%",
      border: "0 0% 48%",
    },
    fonts: {
      ui: "IBM Plex Mono, system-ui",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "solaris_cde",
    name: "Solaris CDE",
    tagline: "Warm stone with deep teal + blue motif.",
    icon: Sun,
    supporterOnly: true,
    preview: {
      background: "41 8% 35%",
      card: "42 14% 87%",
      primary: "175 80% 30%",
      secondary: "205 69% 40%",
      accent: "331 64% 42%",
      border: "0 0% 35%",
    },
    fonts: {
      ui: "IBM Plex Mono, system-ui",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
  {
    id: "sgi_irix",
    name: "SGI IRIX",
    tagline: "Cool steel + deep teal/indigo with safety orange.",
    icon: Server,
    supporterOnly: true,
    preview: {
      background: "207 11% 16%",
      card: "210 8% 86%",
      primary: "182 100% 30%",
      secondary: "255 30% 42%",
      accent: "29 100% 50%",
      border: "0 0% 35%",
    },
    fonts: {
      ui: "IBM Plex Mono, system-ui",
      mono: "IBM Plex Mono, ui-monospace",
    },
  },
];

export function getThemeById(id: string): ThemeMeta | undefined {
  return THEMES.find(t => t.id === id);
}

export function isThemeLocked(themeId: string, isSupporter: boolean): boolean {
  const theme = getThemeById(themeId);
  if (!theme) return true;
  return theme.supporterOnly && !isSupporter;
}

export function setTheme(themeId: string) {
  document.documentElement.setAttribute("data-theme", themeId);
  localStorage.setItem("cc-theme", themeId);
}

export function initTheme() {
  const saved = localStorage.getItem("cc-theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
}
