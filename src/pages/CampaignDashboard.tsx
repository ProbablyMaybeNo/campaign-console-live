import { useState, useCallback, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useCampaign, useIsGM, useUpdateCampaign } from "@/hooks/useCampaigns";
import { usePlayerRole } from "@/hooks/usePlayerRole";
import { useDashboardComponents, DashboardComponent, useDeleteComponent, useUpdateComponent, useCreateComponent } from "@/hooks/useDashboardComponents";
import { useAuth } from "@/hooks/useAuth";
import { useOverlayState, OverlayType } from "@/hooks/useOverlayState";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useDeviceType } from "@/hooks/use-mobile";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { FullScreenLoader } from "@/components/ui/TerminalLoader";
import { InfiniteCanvas } from "@/components/dashboard/InfiniteCanvas";
import { AddComponentModal } from "@/components/dashboard/AddComponentModal";
import { CampaignOverlays } from "@/components/dashboard/CampaignOverlays";
import { PlayerFAB } from "@/components/dashboard/PlayerFAB";
import { PlayerOnboardingModal, usePlayerOnboarding } from "@/components/players/PlayerOnboardingModal";
import { KeyboardShortcutsModal } from "@/components/dashboard/KeyboardShortcutsModal";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { MultiSelectToolbar } from "@/components/dashboard/MultiSelectToolbar";
import { CampaignExportModal } from "@/components/dashboard/CampaignExportModal";
import { GettingStartedModal } from "@/components/help/GettingStartedModal";
import { SupporterWelcomeModal } from "@/components/settings/SupporterWelcomeModal";
import { SupporterHub } from "@/components/supporter/SupporterHub";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";
import { useGMKeyboardShortcuts } from "@/hooks/useGMKeyboardShortcuts";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { HelpButton } from "@/components/help/HelpButton";
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Map, 
  Scroll, 
  MessageSquare, 
  Calendar, 
  LayoutGrid,
  Database,
  BookOpen,
  UserCog,
  PanelLeftOpen,
  PanelLeftClose,
  Command,
  Swords
} from "lucide-react";
import { toast } from "sonner";

const sidebarItems: { 
  id: OverlayType | "home"; 
  label: string; 
  icon: React.ElementType;
  gmOnly?: boolean;
  playerOnly?: boolean;
}[] = [
  { id: "home", label: "Home", icon: LayoutGrid },
  { id: "components", label: "Components", icon: Database, gmOnly: true },
  { id: "battles", label: "Battles", icon: Swords, gmOnly: true },
  { id: "player-settings", label: "My Settings", icon: UserCog, playerOnly: true },
  { id: "players", label: "Players", icon: Users },
  { id: "rules", label: "Rules", icon: Scroll },
  { id: "map", label: "Map", icon: Map },
  { id: "narrative", label: "Narrative", icon: BookOpen },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "schedule", label: "Schedule", icon: Calendar },
];

export default function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useCampaign(campaignId);
  const { data: components = [], isLoading: componentsLoading } = useDashboardComponents(campaignId);
  const { user, signOut } = useAuth();
  const isGM = useIsGM(campaignId);
  const { hasFullControl, permissions } = usePlayerRole(campaignId);
  const deleteComponent = useDeleteComponent();
  const updateComponent = useUpdateComponent();
  const createComponent = useCreateComponent();
  const updateCampaign = useUpdateCampaign();
  const { handleDeleteWithUndo } = useUndoDelete(campaignId!);
  const multiSelect = useMultiSelect();
  const { isPhone } = useDeviceType();

  const { activeOverlay, openOverlay, closeOverlay } = useOverlayState();

  const [selectedComponent, setSelectedComponent] = useState<DashboardComponent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [showSupporterWelcome, setShowSupporterWelcome] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  const { isSupporter } = useEntitlements();
  
  const [previewAsPlayer, setPreviewAsPlayer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem("campaign-sidebar-open");
    return stored !== null ? stored === "true" : true;
  });
  const effectiveIsGM = isGM && !previewAsPlayer;
  
  // Player onboarding
  const { showOnboarding, closeOnboarding } = usePlayerOnboarding(campaignId!, !effectiveIsGM && !isGM);

  // Getting Started modal for new campaigns
  useEffect(() => {
    if (searchParams.get("new") === "1" && isGM && !campaignLoading) {
      setShowGettingStarted(true);
      // Remove the query param without triggering a navigation
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, isGM, campaignLoading]);

  // Supporter welcome modal - show after subscription redirect
  useEffect(() => {
    if (searchParams.get("supporter") === "welcome" && isSupporter) {
      setShowSupporterWelcome(true);
      searchParams.delete("supporter");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, isSupporter]);

  // Handle component selection with multi-select support
  const handleComponentSelect = useCallback((component: DashboardComponent | null, shiftKey = false) => {
    if (!component) {
      setSelectedComponent(null);
      if (!shiftKey) {
        multiSelect.clearSelection();
      }
      return;
    }

    if (shiftKey && effectiveIsGM) {
      multiSelect.toggleSelect(component.id, true);
      setSelectedComponent(component);
    } else {
      multiSelect.toggleSelect(component.id, false);
      setSelectedComponent(component);
    }
  }, [effectiveIsGM, multiSelect]);

  // Escape key clears multi-select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && multiSelect.selectedIds.size > 0) {
        multiSelect.clearSelection();
        setSelectedComponent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [multiSelect]);

  // GM Keyboard Shortcuts
  const handleDeleteSelected = useCallback(() => {
    // Check if user has delete permission
    if (!permissions.canDeleteComponents) {
      toast.error("You don't have permission to delete widgets.");
      return;
    }

    // Handle multi-select delete
    if (multiSelect.selectedIds.size > 1) {
      const selectedComponents = components.filter((c) => multiSelect.selectedIds.has(c.id));
      const lockedCount = selectedComponents.filter((c) => (c.config as { locked?: boolean })?.locked).length;
      if (lockedCount > 0) {
        toast.error(`${lockedCount} widget(s) are locked. Unlock them first.`);
        return;
      }
      selectedComponents.forEach((c) => {
        handleDeleteWithUndo(c, () => {
          deleteComponent.mutate({ id: c.id, campaignId: campaignId! });
        });
      });
      multiSelect.clearSelection();
      setSelectedComponent(null);
      return;
    }

    // Handle single select delete
    if (selectedComponent) {
      const isLocked = (selectedComponent.config as { locked?: boolean })?.locked ?? false;
      if (isLocked) {
        toast.error("Cannot delete a locked widget. Unlock it first.");
        return;
      }
      handleDeleteWithUndo(selectedComponent, () => {
        deleteComponent.mutate({ id: selectedComponent.id, campaignId: campaignId! });
      });
      setSelectedComponent(null);
    }
  }, [selectedComponent, multiSelect, components, handleDeleteWithUndo, deleteComponent, campaignId, permissions.canDeleteComponents]);

  const handleCopyJoinCode = useCallback(() => {
    if (campaign?.join_code) {
      navigator.clipboard.writeText(campaign.join_code);
      toast.success("Join code copied to clipboard!");
    }
  }, [campaign?.join_code]);

  const handleSendAnnouncement = useCallback(() => {
    openOverlay("messages");
    toast.info("Opening Messages to send an announcement");
  }, [openOverlay]);

  const handleExportCampaign = useCallback(() => {
    setShowExportModal(true);
  }, []);

  useGMKeyboardShortcuts({
    isGM: effectiveIsGM,
    onOpenCommandPalette: () => setShowCommandPalette(true),
    onShowShortcuts: () => setShowShortcuts(true),
    onDeleteSelected: handleDeleteSelected,
  });

  // Multi-select bulk operations
  const handleBulkDelete = useCallback(() => {
    if (!permissions.canDeleteComponents) {
      toast.error("You don't have permission to delete widgets.");
      return;
    }
    const selectedComponents = components.filter((c) => multiSelect.selectedIds.has(c.id));
    const lockedCount = selectedComponents.filter((c) => (c.config as { locked?: boolean })?.locked).length;
    if (lockedCount > 0) {
      toast.error(`${lockedCount} widget(s) are locked. Unlock them first.`);
      return;
    }
    selectedComponents.forEach((c) => {
      handleDeleteWithUndo(c, () => {
        deleteComponent.mutate({ id: c.id, campaignId: campaignId! });
      });
    });
    multiSelect.clearSelection();
    setSelectedComponent(null);
    toast.success(`Deleted ${selectedComponents.length} widgets`);
  }, [components, multiSelect, handleDeleteWithUndo, deleteComponent, campaignId, permissions.canDeleteComponents]);

  const handleBulkLock = useCallback(() => {
    const selectedComponents = components.filter((c) => multiSelect.selectedIds.has(c.id));
    selectedComponents.forEach((c) => {
      updateComponent.mutate({
        id: c.id,
        config: { ...(c.config as object), locked: true },
      });
    });
    toast.success(`Locked ${selectedComponents.length} widgets`);
  }, [components, multiSelect, updateComponent]);

  const handleBulkUnlock = useCallback(() => {
    const selectedComponents = components.filter((c) => multiSelect.selectedIds.has(c.id));
    selectedComponents.forEach((c) => {
      updateComponent.mutate({
        id: c.id,
        config: { ...(c.config as object), locked: false },
      });
    });
    toast.success(`Unlocked ${selectedComponents.length} widgets`);
  }, [components, multiSelect, updateComponent]);

  const handleBulkShow = useCallback(() => {
    const selectedComponents = components.filter((c) => multiSelect.selectedIds.has(c.id));
    selectedComponents.forEach((c) => {
      updateComponent.mutate({
        id: c.id,
        config: { ...(c.config as object), visibility: "all" },
      });
    });
    toast.success(`${selectedComponents.length} widgets visible to players`);
  }, [components, multiSelect, updateComponent]);

  const handleBulkHide = useCallback(() => {
    const selectedComponents = components.filter((c) => multiSelect.selectedIds.has(c.id));
    selectedComponents.forEach((c) => {
      updateComponent.mutate({
        id: c.id,
        config: { ...(c.config as object), visibility: "gm" },
      });
    });
    toast.success(`${selectedComponents.length} widgets hidden from players`);
  }, [components, multiSelect, updateComponent]);

  const handleBulkDuplicate = useCallback(() => {
    if (!permissions.canCreateComponents) {
      toast.error("You don't have permission to create widgets.");
      return;
    }
    const selectedComponents = components.filter((c) => multiSelect.selectedIds.has(c.id));
    selectedComponents.forEach((c, index) => {
      createComponent.mutate({
        campaign_id: campaignId!,
        name: `${c.name} (Copy)`,
        component_type: c.component_type,
        data_source: c.data_source,
        config: c.config,
        position_x: c.position_x + 50 + index * 20,
        position_y: c.position_y + 50 + index * 20,
        width: c.width,
        height: c.height,
      });
    });
    multiSelect.clearSelection();
    toast.success(`Duplicated ${selectedComponents.length} widgets`);
  }, [components, multiSelect, createComponent, campaignId, permissions.canCreateComponents]);

  // Persist sidebar state to localStorage
  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem("campaign-sidebar-open", String(open));
  };

  // Filter components based on visibility for players
  const visibleComponents = effectiveIsGM 
    ? components 
    : components.filter((c) => {
        const visibility = (c.config as { visibility?: string })?.visibility;
        return visibility !== "gm";
      });

  const isLoading = campaignLoading || componentsLoading;

  if (isLoading) {
    return <FullScreenLoader text="Loading campaign" />;
  }

  if (campaignError || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-primary/30 rounded p-8 text-center">
          <p className="text-destructive mb-4">[ERROR] Campaign not found</p>
          <Link to="/campaigns">
            <TerminalButton variant="outline" size="sm">
              {"<"} Back to Campaigns
            </TerminalButton>
          </Link>
        </div>
      </div>
    );
  }

  const handleNavClick = (itemId: OverlayType | "home") => {
    if (itemId === "home") {
      closeOverlay();
    } else {
      openOverlay(itemId);
    }
  };

  // Apply theme
  const themeId = campaign?.theme_id || "dark";

  // Phone: Use mobile dashboard
  if (isPhone) {
    return (
      <div data-theme={themeId}>
        <MobileDashboard
          campaign={campaign}
          components={visibleComponents}
          isGM={effectiveIsGM}
          campaignId={campaignId!}
          onOpenOverlay={openOverlay}
          onSignOut={signOut}
          onAddWidget={() => setShowAddModal(true)}
          onExport={() => setShowExportModal(true)}
          onTheme={() => setShowThemePicker(true)}
        />

        {/* Overlays still work the same */}
        <CampaignOverlays
          activeOverlay={activeOverlay}
          onClose={closeOverlay}
          campaignId={campaignId!}
          isGM={effectiveIsGM}
        />

        <AddComponentModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          campaignId={campaignId!}
        />

        <CampaignExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          campaignId={campaignId!}
        />

        {/* Supporter Hub for mobile - hidden for now, can be re-enabled later */}
        {/* <SupporterHub
          isSupporter={isSupporter}
          currentThemeId={campaign?.theme_id || "dark"}
          onThemeSelect={(themeId) => {
            updateCampaign.mutate({
              id: campaignId!,
              theme_id: themeId,
            });
            toast.success(`Theme changed to ${themeId}`);
          }}
          onAddSmartPaste={() => openOverlay("rules")}
          onAddSticker={() => setShowAddModal(true)}
          onAddText={() => setShowAddModal(true)}
        /> */}
      </div>
    );
  }

  // Tablet/Desktop: Use infinite canvas
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" data-theme={themeId}>
      {/* Fixed Header */}
      <header className="border-b-2 border-[hsl(142,76%,65%)] bg-card/95 backdrop-blur-sm px-4 py-3 flex-shrink-0 sticky top-0 z-50" style={{ boxShadow: '0 1px 15px hsl(142 76% 50% / 0.3)' }}>
        <div className="flex items-center justify-between">
          <Link 
            to="/campaigns" 
            className="text-[hsl(200,100%,70%)] hover:text-[hsl(200,100%,80%)] transition-all"
            style={{ textShadow: '0 0 12px hsl(200 100% 60% / 0.7), 0 0 25px hsl(200 100% 50% / 0.4)' }}
          >
            <span className="flex items-center gap-1 font-mono text-sm font-medium uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4" />
              Campaigns
            </span>
          </Link>
          
          <div className="flex items-center gap-3">
            {isGM ? (
              <button
                onClick={() => {
                  setPreviewAsPlayer(!previewAsPlayer);
                  toast.info(previewAsPlayer ? "Returning to GM view" : "Previewing as Player");
                }}
                className={`px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer hover:opacity-90 ${
                  previewAsPlayer 
                    ? "bg-[hsl(142,76%,50%)] text-black ring-2 ring-[hsl(200,100%,65%)] ring-offset-2 ring-offset-background" 
                    : "bg-[hsl(200,100%,65%)] text-black"
                }`}
                style={{ 
                  boxShadow: previewAsPlayer 
                    ? '0 0 20px hsl(142 76% 50% / 0.6), 0 0 40px hsl(142 76% 50% / 0.3)' 
                    : '0 0 20px hsl(200 100% 60% / 0.6), 0 0 40px hsl(200 100% 50% / 0.3)' 
                }}
                title={previewAsPlayer ? "Click to return to GM view" : "Click to preview as Player"}
              >
                {previewAsPlayer ? "Player (Preview)" : "Games Master"}
              </button>
            ) : (
              <div 
                className="px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[hsl(142,76%,45%)] text-black"
                style={{ boxShadow: '0 0 15px hsl(142 76% 50% / 0.5), 0 0 30px hsl(142 76% 50% / 0.25)' }}
              >
                Player
              </div>
            )}
            <TerminalButton variant="outline" size="sm" onClick={() => signOut()}>
              Logout
            </TerminalButton>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Collapsible Sidebar - GM only */}
        {effectiveIsGM && (
          <aside 
            className={`border-r-2 border-[hsl(142,76%,65%)] bg-sidebar/95 backdrop-blur-sm flex-shrink-0 hidden md:flex flex-col overflow-y-auto transition-all duration-300 ease-in-out ${
              sidebarOpen ? "w-56 p-4" : "w-0 p-0 border-r-0"
            }`}
            style={{ boxShadow: sidebarOpen ? '1px 0 15px hsl(142 76% 50% / 0.2)' : 'none' }}
          >
            <div className={`transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <div className="flex items-center justify-between mb-3 px-3">
                <p className="text-xs uppercase tracking-wider text-white font-medium">Campaign Control</p>
                <button
                  onClick={() => handleSidebarToggle(false)}
                  className="text-[hsl(142,76%,55%)] hover:text-[hsl(142,76%,70%)] transition-colors"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1 flex-1">
                {sidebarItems.map((item) => {
                  if (item.gmOnly && !effectiveIsGM) return null;
                  if (item.playerOnly && effectiveIsGM) return null;
                  
                  const isActive = item.id === "home" 
                    ? !activeOverlay 
                    : activeOverlay === item.id;
                  
                  return (
                    <NavItem
                      key={item.id}
                      icon={<item.icon className="w-4 h-4" />}
                      label={item.label}
                      active={isActive}
                      onClick={() => handleNavClick(item.id)}
                    />
                  );
                })}

                <div className="h-px bg-border my-3" />
                <NavItem 
                  icon={<Settings className="w-4 h-4" />} 
                  label="Settings" 
                  active={activeOverlay === "settings"}
                  onClick={() => openOverlay("settings")}
                />
              </nav>
              
              {/* Supporter Hub - hidden for now, can be re-enabled later */}
              {/* <div className="mt-auto pt-4 border-t border-border">
                <SupporterHub
                  isSupporter={isSupporter}
                  currentThemeId={campaign?.theme_id || "dark"}
                  onThemeSelect={(themeId) => {
                    updateCampaign.mutate({
                      id: campaignId!,
                      theme_id: themeId,
                    });
                    toast.success(`Theme changed to ${themeId}`);
                  }}
                  onAddSmartPaste={() => {
                    openOverlay("rules");
                    toast.info("Opening Rules to use Smart Paste");
                  }}
                  onAddSticker={() => {
                    setShowAddModal(true);
                    toast.info("Opening widget picker for Sticker");
                  }}
                  onAddText={() => {
                    setShowAddModal(true);
                    toast.info("Opening widget picker for Text");
                  }}
                />
              </div> */}
            </div>
          </aside>
        )}

        <main 
          className="flex-1 overflow-hidden relative min-h-0 border-r-2 border-b-2 border-[hsl(142,76%,65%)]"
          style={{ boxShadow: 'inset -1px -1px 15px hsl(142 76% 50% / 0.2)' }}
        >
          {/* Campaign Control button - appears when sidebar is closed */}
          {effectiveIsGM && !sidebarOpen && (
            <button
              onClick={() => handleSidebarToggle(true)}
              className="absolute top-4 left-4 z-40 flex items-center gap-2 px-4 py-2 rounded bg-[hsl(142,76%,50%)]/10 border border-[hsl(142,76%,65%)] text-[hsl(142,76%,65%)] font-mono text-xs font-bold uppercase tracking-wider transition-all hover:bg-[hsl(142,76%,50%)]/20 hover:scale-105"
              style={{ 
                boxShadow: '0 0 15px hsl(142 76% 50% / 0.3), 0 0 30px hsl(142 76% 50% / 0.15)',
                textShadow: '0 0 10px hsl(142 76% 50% / 0.6)'
              }}
              title="Open Campaign Control"
            >
              <PanelLeftOpen className="w-4 h-4" />
              Campaign Control
            </button>
          )}

          <InfiniteCanvas
            components={visibleComponents}
            isGM={effectiveIsGM}
            campaignId={campaignId!}
            selectedComponentId={selectedComponent?.id || null}
            multiSelectedIds={multiSelect.selectedIds}
            onComponentSelect={handleComponentSelect}
          />

          {/* GM: Quick Actions FAB + Help */}
          {effectiveIsGM && (
            <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-3 items-center">
              <HelpButton variant="fab" />
              <button
                className="h-14 w-14 rounded-full bg-primary hover:bg-primary-bright text-primary-foreground font-bold text-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 hover-glow-primary"
                style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.25)' }}
                onClick={() => setShowCommandPalette(true)}
                title="Quick Actions (Ctrl+K)"
              >
                <Command className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </div>
          )}

          {/* Player: Expandable FAB menu */}
          {!effectiveIsGM && (
            <PlayerFAB 
              campaignId={campaignId!} 
              onOpenOverlay={openOverlay}
            />
          )}
        </main>
      </div>

      {/* Multi-select toolbar */}
      {effectiveIsGM && (
        <MultiSelectToolbar
          selectedCount={multiSelect.selectedIds.size}
          onDelete={handleBulkDelete}
          onLockAll={handleBulkLock}
          onUnlockAll={handleBulkUnlock}
          onShowAll={handleBulkShow}
          onHideAll={handleBulkHide}
          onDuplicateAll={handleBulkDuplicate}
          onClearSelection={multiSelect.clearSelection}
          canCreate={permissions.canCreateComponents}
          canDelete={permissions.canDeleteComponents}
        />
      )}

      <CampaignOverlays
        activeOverlay={activeOverlay}
        onClose={closeOverlay}
        campaignId={campaignId!}
        isGM={effectiveIsGM}
      />

      <AddComponentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        campaignId={campaignId!}
      />

      {/* Player Onboarding Modal */}
      {campaign && (
        <PlayerOnboardingModal
          campaignId={campaignId!}
          campaignName={campaign.name}
          open={showOnboarding}
          onClose={closeOnboarding}
        />
      )}

      {/* GM: Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* GM: Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        campaignId={campaignId!}
        onOpenOverlay={openOverlay}
        onAddComponent={() => setShowAddModal(true)}
        onShowShortcuts={() => setShowShortcuts(true)}
        onCopyJoinCode={handleCopyJoinCode}
        onSendAnnouncement={handleSendAnnouncement}
        onExportCampaign={handleExportCampaign}
        onShowGettingStarted={() => setShowGettingStarted(true)}
      />

      {/* Export Modal */}
      <CampaignExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        campaignId={campaignId!}
      />

      {/* Getting Started Modal for new campaigns */}
      <GettingStartedModal
        open={showGettingStarted}
        onClose={() => setShowGettingStarted(false)}
        joinCode={campaign?.join_code || undefined}
        onCopyJoinCode={handleCopyJoinCode}
      />

      {/* Supporter Welcome Modal - hidden for now */}
      {/* <SupporterWelcomeModal
        open={showSupporterWelcome}
        onClose={() => setShowSupporterWelcome(false)}
      /> */}
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-wider transition-all duration-200 rounded-sm group ${
        active
          ? "bg-secondary/15 text-secondary border-l-2 border-secondary"
          : "text-primary hover:text-primary-bright hover:bg-primary/10 border-l-2 border-transparent hover:border-primary/50"
      }`}
      style={active 
        ? { textShadow: '0 0 12px hsl(var(--secondary) / 0.7)', boxShadow: 'inset 0 0 15px hsl(var(--secondary) / 0.1)' } 
        : undefined
      }
    >
      <span className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`}>
        {icon}
      </span>
      <span className="transition-colors duration-200">{label}</span>
    </button>
  );
}
