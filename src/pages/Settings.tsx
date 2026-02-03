import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "billing";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-primary/30 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/campaigns")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Campaigns
            </TerminalButton>
            
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-mono font-semibold text-primary">
                Supporters
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 bg-card border border-primary/30">
            <TabsTrigger value="billing" className="data-[state=active]:bg-primary/20">
              Billing
            </TabsTrigger>
            {/* Add more tabs here as needed */}
          </TabsList>

          <TabsContent value="billing">
            <BillingSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
