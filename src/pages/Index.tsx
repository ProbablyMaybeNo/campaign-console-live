import { Link } from "react-router-dom";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { useAuth } from "@/hooks/useAuth";
import headerImage from "@/assets/campaign-console-header.png";
import { Swords, Map, Shield, BookOpen, CalendarDays, Dice5, UserPlus, LayoutDashboard, ChevronDown } from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Swords,
    title: "Battle Tracker",
    description: "Run rounds, pair players, record results, and track standings across your entire campaign."
  },
  {
    icon: Map,
    title: "Interactive Maps",
    description: "Upload campaign maps, place markers, manage fog of war, and share territory control with players."
  },
  {
    icon: Shield,
    title: "Warband Manager",
    description: "Build rosters, track unit stats and equipment, and manage points across your warband."
  },
  {
    icon: BookOpen,
    title: "Narrative Events",
    description: "Publish story updates, lore entries, and campaign dispatches your players can follow along with."
  },
  {
    icon: CalendarDays,
    title: "Scheduling",
    description: "Plan rounds, set deadlines, and keep your campaign on track with a shared calendar."
  },
  {
    icon: Dice5,
    title: "Dice & Rules",
    description: "Roll dice in-app, import game rules, and give your group a quick-reference rules library."
  },
];

const steps = [
  {
    icon: LayoutDashboard,
    step: "01",
    title: "Create a Campaign",
    description: "Set up your campaign in seconds — name it, pick a game system, and customise the dashboard."
  },
  {
    icon: UserPlus,
    step: "02",
    title: "Invite Your Players",
    description: "Share a join code and players hop in. They can manage their own warbands and submit battle reports."
  },
  {
    icon: Swords,
    step: "03",
    title: "Track Everything",
    description: "Run battles, update maps, publish narrative, and keep the whole campaign organised in one place."
  },
];

const faqs = [
  {
    q: "What is Campaign Console?",
    a: "Campaign Console is a free, rules-agnostic campaign tracker designed for tabletop wargames and RPGs. It helps Game Masters manage battles, warbands, maps, schedules, and narrative events all in one place."
  },
  {
    q: "Is Campaign Console free to use?",
    a: "Yes! Campaign Console is completely free. Create campaigns, invite players, and track everything at no cost. Optional supporter tiers unlock cosmetic themes and extra features."
  },
  {
    q: "What game systems does it support?",
    a: "Campaign Console is rules-agnostic and works with any tabletop wargame or RPG — Warhammer 40k, Age of Sigmar, Mordheim, Necromunda, Kill Team, Frostgrave, and many more."
  },
  {
    q: "Can players join my campaign?",
    a: "Yes! Share a join code with your group. Players can join your campaign, submit battle reports, manage their warbands, and view maps and schedules you publish."
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-primary/20 rounded">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left text-sm font-mono text-foreground hover:bg-primary/5 transition-colors"
      >
        <span>{q}</span>
        <ChevronDown className={`h-4 w-4 text-primary shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 70%)'
        }}
      />

      {/* ── Hero ── */}
      <main className="relative z-10">
        <header className="flex flex-col items-center justify-center text-center px-4 pt-12 pb-8 sm:pt-20 sm:pb-12">
          <div className="flex justify-center -mb-10">
            <img
              src={headerImage}
              alt="Campaign Console — Wargame Campaign Tracker"
              className="w-full max-w-2xl h-auto drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
              width={672}
              height={200}
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg text-white uppercase tracking-wider text-glow-white">
              Tabletop Campaign Tracker for Wargames &amp; RPGs
            </h1>
            <p className="text-xs text-white/90 font-mono text-glow-white animate-pulse">
              BOOT: CAMPAIGN OPTIMIZATION — INITIALIZING...
            </p>
          </div>

          <section className="space-y-2 pt-2" aria-label="Intro">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              A free, rules-agnostic campaign hub built for tabletop games. Track rounds and battles, organize players and warbands, manage maps and schedules, and publish rules and narrative updates to your group.
            </p>
          </section>

          <nav className="flex flex-col sm:flex-row gap-4 justify-center pt-6" aria-label="Primary">
            {user ? (
              <Link to="/campaigns">
                <TerminalButton size="lg" className="hover-glow-primary transition-all duration-200 hover:scale-105 active:scale-95">
                  Enter Console
                </TerminalButton>
              </Link>
            ) : (
              <Link to="/auth">
                <TerminalButton size="lg" className="hover-glow-primary transition-all duration-200 hover:scale-105 active:scale-95">
                  Access System
                </TerminalButton>
              </Link>
            )}
          </nav>
        </header>

        {/* ── Features ── */}
        <section className="relative z-10 max-w-5xl mx-auto px-4 py-12 sm:py-16" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-center text-sm uppercase tracking-widest text-primary font-mono mb-8">
            [ Features ]
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <article key={f.title} className="border border-primary/20 rounded-lg p-5 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-colors">
                <f.icon className="h-6 w-6 text-primary mb-3" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="relative z-10 max-w-3xl mx-auto px-4 py-12 sm:py-16" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-center text-sm uppercase tracking-widest text-primary font-mono mb-10">
            [ How It Works ]
          </h2>
          <div className="space-y-8">
            {steps.map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded border border-primary/30 flex items-center justify-center text-primary font-mono text-xs">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="relative z-10 max-w-2xl mx-auto px-4 py-12 sm:py-16" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-center text-sm uppercase tracking-widest text-primary font-mono mb-8">
            [ Frequently Asked Questions ]
          </h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <FAQItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative z-10 text-center px-4 py-12 sm:py-16" aria-label="Call to action">
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Ready to run your next campaign? Sign up in seconds — no credit card required.
          </p>
          <Link to={user ? "/campaigns" : "/auth"}>
            <TerminalButton size="lg" className="hover-glow-primary transition-all duration-200 hover:scale-105 active:scale-95">
              {user ? "Enter Console" : "Get Started Free"}
            </TerminalButton>
          </Link>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-primary/10 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Campaign Console. Free tabletop campaign tracker.</p>
          <nav className="flex gap-4" aria-label="Footer">
            <a href="#features-heading" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-heading" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#faq-heading" className="hover:text-primary transition-colors">FAQ</a>
            <Link to="/auth" className="hover:text-primary transition-colors">Sign In</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
