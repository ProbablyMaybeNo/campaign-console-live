import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Search,
  LogIn,
  Swords,
  Users,
  LayoutGrid,
  Puzzle,
  ClipboardPaste,
  MapPin,
  BookOpen,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
} from "lucide-react";

interface HelpFAQModalProps {
  open: boolean;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    id: "accounts",
    title: "Accounts & Login",
    icon: LogIn,
    items: [
      {
        question: "How do I log in or create an account?",
        answer: "Use the login screen to sign in, or click Create Account to register. After logging in, you'll be taken to your Campaigns list.",
      },
      {
        question: "Why can't I log in?",
        answer: "Most issues come from incorrect email/password, an account not yet created, or a temporary connection issue. Try again or refresh the page.",
      },
    ],
  },
  {
    id: "campaigns",
    title: "Campaigns",
    icon: Swords,
    items: [
      {
        question: "How do I create a campaign?",
        answer: "From the Campaigns page, click Create, enter a campaign name (required), and optionally set description, player limit, points limit, rounds, or a password.",
      },
      {
        question: "How do players join my campaign?",
        answer: "Share the Campaign ID (join code). Players use Join on their Campaigns page and enter the code (and password if required).",
      },
      {
        question: "Why can't someone join my campaign?",
        answer: "Common causes: incorrect join code, wrong password, campaign deleted, or campaign already full.",
      },
      {
        question: "How do I delete a campaign?",
        answer: "From the Campaigns page, select a campaign you own → Remove Campaign → confirm. This removes it for all users.",
      },
      {
        question: "Can GM ownership be transferred?",
        answer: "Not currently. The campaign creator is always the GM.",
      },
    ],
  },
  {
    id: "roles",
    title: "Roles: Game Master vs Player",
    icon: Users,
    items: [
      {
        question: "What can the GM do?",
        answer: "The GM can: Add, remove, move, and resize dashboard components; Change campaign settings; Manage players; Control what is visible to players.",
      },
      {
        question: "What can players do?",
        answer: "Players can: View and interact with components; Roll dice, read info, view maps; Edit their own player info. Players cannot change the layout or delete components.",
      },
      {
        question: 'What is "Preview as Player"?',
        answer: "A GM toggle that shows exactly what players see. GM-only items and controls are hidden while this mode is active.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard Basics",
    icon: LayoutGrid,
    items: [
      {
        question: "What is the dashboard?",
        answer: "A shared infinite canvas where campaign tools live. Everyone can pan and zoom. Only the GM can edit the layout.",
      },
      {
        question: "What is the Campaign Console widget?",
        answer: "The main campaign info panel showing campaign name, round, status, and key metadata. It always exists and acts as the dashboard's anchor point.",
      },
      {
        question: "How do I navigate the dashboard?",
        answer: "Pan by clicking and dragging on empty space, zoom with the controls in the top-right corner, and use the recenter button (or Home key) to return to the Campaign Console.",
      },
    ],
  },
  {
    id: "components",
    title: "Components (Widgets)",
    icon: Puzzle,
    items: [
      {
        question: "How do I add components? (GM only)",
        answer: "Click the floating + button in the bottom-right corner, choose a component type, configure it, and add it to the dashboard.",
      },
      {
        question: "How do I move or resize components? (GM only)",
        answer: "Drag the title bar to move a component. Use the corner handle to resize.",
      },
      {
        question: "How do I delete a component? (GM only)",
        answer: "Click the X button on the component header, or remove it from the Components list in the sidebar.",
      },
      {
        question: "How do I hide components from players? (GM only)",
        answer: "Toggle visibility to GM-only in the Components manager (sidebar → Components).",
      },
      {
        question: "What component types are available?",
        answer: `• Custom Table – Track initiative, resources, injuries, or anything else
• Custom Card – Freeform notes or reminders
• Narrative – Campaign story log written by the GM
• Counter – Numeric trackers (victory points, turns, threat level)
• Dice Roller – Shared dice rolling (d4–d100, multiple dice)
• Image – Display handouts, reference art, or diagrams
• Map – Campaign map with markers and fog of war
• Player List – Automatically shows all players and their info
• Calendar – Displays scheduled rounds or events`,
      },
    ],
  },
  {
    id: "paste-wizard",
    title: "Paste Wizard",
    icon: ClipboardPaste,
    items: [
      {
        question: "What is the Paste Wizard?",
        answer: "A helper tool that turns pasted text or rows into tables or cards quickly, saving you time when setting up content.",
      },
      {
        question: "When does it appear?",
        answer: "When creating Custom Tables or Cards from the Add Component menu.",
      },
      {
        question: "Why does my pasted data look wrong?",
        answer: "Usually caused by inconsistent formatting in the source. Clean up rows and columns before pasting for best results.",
      },
    ],
  },
  {
    id: "players",
    title: "Players & Player Info",
    icon: Users,
    items: [
      {
        question: "How does a player set their name and info?",
        answer: "Click My Settings on the dashboard (via the floating menu button) to set your name, faction, points/resources, and notes.",
      },
      {
        question: "Can the GM edit player info?",
        answer: "Yes, GMs can edit any player's information via the Players manager in the sidebar.",
      },
      {
        question: "How does a player leave a campaign?",
        answer: "Open My Settings → scroll to the bottom → Leave Campaign → confirm.",
      },
      {
        question: "How does the GM remove a player?",
        answer: "Players manager (sidebar) → find the player → remove → confirm.",
      },
    ],
  },
  {
    id: "map",
    title: "Map Tools",
    icon: MapPin,
    items: [
      {
        question: "How do I add a map? (GM)",
        answer: "Open the Map overlay from the sidebar and upload an image.",
      },
      {
        question: "What are markers and legends?",
        answer: "Legend items define marker types (e.g., 'City', 'Battle Site'). Markers are placed points on the map that use these legend types.",
      },
      {
        question: "Can markers be hidden from players?",
        answer: "Yes, individual markers can be set to GM-only visibility.",
      },
      {
        question: "What is fog of war?",
        answer: "Hidden map regions that only the GM can see. The GM can reveal fog regions to players as the campaign progresses.",
      },
    ],
  },
  {
    id: "narrative",
    title: "Narrative, Messages & Schedule",
    icon: BookOpen,
    items: [
      {
        question: "What is the Narrative overlay?",
        answer: "A space for GM-written campaign story entries that chronicle the campaign's events and lore.",
      },
      {
        question: "What is the Messages overlay?",
        answer: "A simple campaign-wide chat for announcements and communication between the GM and players.",
      },
      {
        question: "What is the Schedule / Calendar?",
        answer: "A GM-managed calendar displaying campaign rounds and events, helping coordinate sessions and track progress.",
      },
    ],
  },
  {
    id: "issues",
    title: "Common Issues",
    icon: AlertTriangle,
    items: [
      {
        question: "Campaign not found when joining",
        answer: "The join code is incorrect or the campaign no longer exists. Double-check the code with the GM.",
      },
      {
        question: "Players can't see something on the dashboard",
        answer: "The component may be set to GM-only. Check visibility in the Components manager, or use Preview as Player to verify.",
      },
      {
        question: "I can't move or edit components",
        answer: "You're either a player (only GMs can edit layout) or the GM has Preview as Player mode active.",
      },
      {
        question: "Changes don't appear immediately",
        answer: "Try refreshing the page. Persistent issues may be connectivity-related.",
      },
    ],
  },
  {
    id: "tips",
    title: "Best Practices",
    icon: Lightbulb,
    items: [
      {
        question: "How many components should I use?",
        answer: "Keep dashboards focused – 6 to 12 components works well for most campaigns. Too many can feel cluttered.",
      },
      {
        question: "How should I organize my dashboard?",
        answer: "Center session-critical widgets near the Campaign Console. Use GM-only components for secrets and prep work.",
      },
      {
        question: "What should I add first?",
        answer: "Add Narrative and Map early to anchor the campaign's story and setting. These give players immediate context.",
      },
      {
        question: "Any tracking tips?",
        answer: "Use Counter widgets instead of external spreadsheets. They're visible to everyone and update in real-time.",
      },
    ],
  },
];

export function HelpFAQModal({ open, onClose }: HelpFAQModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = faqSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-[hsl(142,76%,65%)] max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-[hsl(142,76%,50%)] uppercase tracking-wider">
            <HelpCircle className="w-5 h-5" />
            Help & FAQ
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 pr-4" data-scrollable="true">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{searchQuery}"</p>
              <p className="text-xs mt-2">Try different keywords</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredSections.map((section) => (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center gap-2 pt-4 pb-2">
                    <section.icon className="w-4 h-4 text-[hsl(200,100%,65%)]" />
                    <h3 className="text-sm font-mono text-[hsl(200,100%,65%)] uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                  
                  {section.items.map((item, idx) => (
                    <AccordionItem
                      key={`${section.id}-${idx}`}
                      value={`${section.id}-${idx}`}
                      className="border border-border rounded-md px-4 bg-muted/20"
                    >
                      <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4 whitespace-pre-line">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </div>
              ))}
            </Accordion>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Can't find what you're looking for? Contact your Games Master or check back for updates.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
