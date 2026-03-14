import type { DashboardComponent } from "@/hooks/useDashboardComponents";

export const WIDGET_ICONS: Record<string, string> = {
  table: "📊",
  rules_table: "📊",
  custom_table: "📊",
  card: "🃏",
  rules_card: "🃏",
  custom_card: "🃏",
  counter: "🔢",
  image: "🖼️",
  dice_roller: "🎲",
  map: "🗺️",
  player_list: "👥",
  narrative_table: "📖",
  calendar: "📅",
  activity_feed: "⚡",
  roll_recorder: "📜",
  announcements: "📢",
  "campaign-console": "⚔️",
  text: "📝",
  sticker: "⭐",
  battle_tracker: "⚔️",
  card_deck: "🃏",
};

export function getWidgetIcon(componentType: DashboardComponent["component_type"] | string) {
  return WIDGET_ICONS[componentType] ?? "📦";
}
