// Sticker library using Lucide icon names
// Icons are grouped by category for easy browsing

export interface StickerCategory {
  id: string;
  name: string;
  icons: string[];
}

export const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: "objectives",
    name: "Objectives",
    icons: [
      "Target", "Flag", "FlagTriangleRight", "Star", "Trophy", 
      "Medal", "Award", "Crown", "Gem", "Gift"
    ],
  },
  {
    id: "units",
    name: "Units",
    icons: [
      "Sword", "Swords", "Shield", "ShieldCheck", "Users", 
      "User", "UserRound", "Skull", "Crosshair", "Axe"
    ],
  },
  {
    id: "terrain",
    name: "Terrain",
    icons: [
      "Mountain", "MountainSnow", "Trees", "TreePine", "TreeDeciduous",
      "Waves", "Droplets", "CloudRain", "Sun", "Moon"
    ],
  },
  {
    id: "buildings",
    name: "Buildings",
    icons: [
      "Home", "Building", "Building2", "Castle", "Church",
      "Store", "Factory", "Warehouse", "Tent", "Landmark"
    ],
  },
  {
    id: "status",
    name: "Status",
    icons: [
      "AlertCircle", "AlertTriangle", "CheckCircle", "XCircle", "Clock",
      "Hourglass", "Timer", "CircleDot", "CircleX", "CircleCheck"
    ],
  },
  {
    id: "loot",
    name: "Loot & Resources",
    icons: [
      "Coins", "Banknote", "Gem", "Diamond", "Package",
      "Box", "Archive", "Briefcase", "Backpack", "ScrollText"
    ],
  },
  {
    id: "danger",
    name: "Danger",
    icons: [
      "Skull", "Flame", "Zap", "AlertTriangle", "Bomb",
      "Bug", "Ghost", "Biohazard", "Radiation", "TriangleAlert"
    ],
  },
  {
    id: "arrows",
    name: "Arrows & Direction",
    icons: [
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "ArrowUpRight", "ArrowDownLeft", "MoveUp", "MoveDown",
      "Compass", "Navigation"
    ],
  },
  {
    id: "misc",
    name: "Miscellaneous",
    icons: [
      "Eye", "EyeOff", "Lock", "Unlock", "Key",
      "Bookmark", "MapPin", "Pin", "Heart", "HeartOff"
    ],
  },
];

// Flat list of all icons for searching
export const ALL_STICKER_ICONS: string[] = STICKER_CATEGORIES.flatMap(cat => cat.icons);

// Default sticker configuration
export const DEFAULT_STICKER_CONFIG = {
  icon: "Star",
  size: "md" as "sm" | "md" | "lg",
  color: "hsl(142, 76%, 55%)", // Primary green
};

// Preset colors for stickers
export const STICKER_COLORS = [
  { value: "hsl(142, 76%, 55%)", label: "Green" },
  { value: "hsl(195, 100%, 60%)", label: "Cyan" },
  { value: "hsl(0, 90%, 60%)", label: "Red" },
  { value: "hsl(38, 95%, 55%)", label: "Orange" },
  { value: "hsl(280, 85%, 65%)", label: "Purple" },
  { value: "hsl(217, 91%, 60%)", label: "Blue" },
  { value: "hsl(45, 100%, 60%)", label: "Gold" },
  { value: "hsl(0, 0%, 95%)", label: "White" },
];

// Size mappings
export const STICKER_SIZES = {
  sm: { pixels: 32, label: "Small" },
  md: { pixels: 48, label: "Medium" },
  lg: { pixels: 72, label: "Large" },
};
