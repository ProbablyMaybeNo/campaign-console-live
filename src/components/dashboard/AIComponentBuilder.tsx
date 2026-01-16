import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { useCampaignDocuments, useUploadCampaignDocument, getDocumentContent } from "@/hooks/useCampaignDocuments";
import { useWargameRules, useRuleCategories, type RuleCategory, type WargameRule } from "@/hooks/useWargameRules";
import { RulesCategoryBrowser } from "./RulesCategoryBrowser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bot, 
  Upload, 
  Link, 
  Loader2,
  FileText,
  X,
  Send,
  User,
  CheckCircle,
  Table,
  LayoutList,
  FolderOpen,
  Book,
  Sparkles
} from "lucide-react";

interface AIComponentBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

interface ParsedTableData {
  title: string;
  columns: string[];
  rows: Record<string, string>[];
}

interface ParsedCardData {
  title: string;
  cards: Array<{
    id: string;
    name: string;
    description: string;
    properties?: Record<string, string>;
  }>;
}

interface ComponentData {
  type: "table" | "card";
  data: ParsedTableData | ParsedCardData;
  created?: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  components?: ComponentData[];
  isLoading?: boolean;
}

// Pre-defined suggestion templates based on common wargame rule categories
const SUGGESTION_TEMPLATES: Record<string, string[]> = {
  "Injury": ["Create an injury table widget", "Show me all injury effects as cards"],
  "Exploration": ["Build an exploration rewards table", "Create loot cards from exploration rules"],
  "Equipment": ["Create an equipment reference table", "Show weapon stats as a sortable table"],
  "Advancement": ["Build an advancement table for experience", "Create skill cards for leveling"],
  "Scenarios": ["Create scenario cards with objectives", "Build a scenario selection table"],
  "Warband": ["Create a warband composition reference", "Build a quick-reference for warband rules"],
};

export function AIComponentBuilder({ open, onOpenChange, campaignId }: AIComponentBuilderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [sourceTab, setSourceTab] = useState<"documents" | "rules">("rules");
  const [selectedRulesContext, setSelectedRulesContext] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const createComponent = useCreateComponent();
  
  // Fetch saved campaign documents and rules
  const { data: campaignDocuments = [] } = useCampaignDocuments(campaignId);
  const { data: campaignRules = [] } = useWargameRules(campaignId);
  const ruleCategories = useRuleCategories(campaignId);
  const uploadDocument = useUploadCampaignDocument(campaignId);

  // Get smart suggestions based on available rule categories
  const getSuggestions = (): string[] => {
    const suggestions: string[] = [];
    
    ruleCategories.forEach(category => {
      // Check for matching templates
      const categoryLower = category.category.toLowerCase();
      Object.entries(SUGGESTION_TEMPLATES).forEach(([key, templates]) => {
        if (categoryLower.includes(key.toLowerCase())) {
          suggestions.push(...templates.slice(0, 1));
        }
      });
    });
    
    // Add generic suggestions if we have rules
    if (campaignRules.length > 0 && suggestions.length < 3) {
      suggestions.push("Create a quick reference table from my rules");
      suggestions.push("Build cards for all rules in a category");
    }
    
    return suggestions.slice(0, 4);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a supported file type
    const isText = file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md");
    const isPdf = file.type === "application/pdf";
    
    if (!isText && !isPdf) {
      toast.error("Unsupported file type. Please use .txt, .md, or .pdf files.");
      return;
    }

    setFileName(file.name);
    setSelectedDocumentId(""); // Clear any selected saved document

    if (isText) {
      const text = await file.text();
      setSourceContent(text);
      toast.success(`Loaded ${file.name}`);
    } else if (isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        setSourceContent(`[PDF Content from: ${file.name}]`);
      };
      reader.readAsDataURL(file);
      toast.info("PDF uploaded. The AI will extract content from it.");
    }

    // Upload to campaign storage for future use
    uploadDocument.mutate(file);
  };

  const handleSelectSavedDocument = async (documentId: string) => {
    if (!documentId) {
      clearFile();
      return;
    }

    const document = campaignDocuments.find(d => d.id === documentId);
    if (!document) return;

    setSelectedDocumentId(documentId);
    setFileName(document.name);
    setIsLoadingDocument(true);

    try {
      const content = await getDocumentContent(document.file_path);
      setSourceContent(content);
      toast.success(`Loaded "${document.name}"`);
    } catch (error) {
      console.error("Error loading document:", error);
      toast.error("Failed to load document");
      setSelectedDocumentId("");
      setFileName("");
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedInput,
    };

    const assistantPlaceholder: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content + (m.components 
          ? `\n[Created ${m.components.length} component(s): ${m.components.map(c => c.data.title).join(", ")}]`
          : "")
      }));

      // Include rules context if selected
      const rulesContext = selectedRulesContext || undefined;

      const { data, error } = await supabase.functions.invoke("ai-component-builder", {
        body: {
          prompt: trimmedInput,
          campaignId, // Pass campaign ID for live data access
          conversationHistory,
          sourceContent: sourceContent || undefined,
          sourceUrl: sourceUrl || undefined,
          rulesContext,
        },
      });

      if (error) throw error;

      if (data.error) {
        setMessages(prev => prev.map(m => 
          m.id === assistantPlaceholder.id 
            ? { ...m, content: `Sorry, I encountered an error: ${data.error}`, isLoading: false }
            : m
        ));
        return;
      }

      // Update the assistant message with response
      setMessages(prev => prev.map(m => 
        m.id === assistantPlaceholder.id 
          ? { 
              ...m, 
              content: data.message || "Here's what I found:",
              components: data.components,
              isLoading: false 
            }
          : m
      ));

    } catch (error) {
      console.error("AI chat error:", error);
      setMessages(prev => prev.map(m => 
        m.id === assistantPlaceholder.id 
          ? { ...m, content: "Sorry, something went wrong. Please try again.", isLoading: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateComponent = async (messageId: string, componentIndex: number) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.components?.[componentIndex]) return;

    const component = message.components[componentIndex];
    const componentData = component.data;

    try {
      let config: Record<string, unknown> = {
        manual_setup: true,
        title: componentData.title,
      };

      if (component.type === "table" && "columns" in componentData) {
        config = {
          ...config,
          columns: componentData.columns,
          rows: componentData.rows,
        };
      } else if (component.type === "card" && "cards" in componentData) {
        config = {
          ...config,
          cards: componentData.cards,
          isManual: true,
        };
      }

      await createComponent.mutateAsync({
        campaign_id: campaignId,
        name: componentData.title,
        component_type: component.type,
        config: config as unknown as import("@/integrations/supabase/types").Json,
        position_x: Math.round(100 + Math.random() * 200 + componentIndex * 50),
        position_y: Math.round(100 + Math.random() * 200 + componentIndex * 50),
        width: 400,
        height: 350,
      });

      // Mark component as created
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId || !m.components) return m;
        const updatedComponents = [...m.components];
        updatedComponents[componentIndex] = { ...updatedComponents[componentIndex], created: true };
        return { ...m, components: updatedComponents };
      }));

      toast.success(`Created "${componentData.title}"!`);
    } catch (error) {
      console.error("Create component error:", error);
      toast.error("Failed to create component");
    }
  };

  const handleCreateAllComponents = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.components) return;

    const uncreatedIndices = message.components
      .map((c, i) => c.created ? -1 : i)
      .filter(i => i !== -1);

    for (const index of uncreatedIndices) {
      await handleCreateComponent(messageId, index);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInput("");
    setSourceUrl("");
    setSourceContent("");
    setFileName("");
    setSelectedDocumentId("");
    setSelectedRulesContext("");
    onOpenChange(false);
  };

  const clearFile = () => {
    setSourceContent("");
    setFileName("");
    setSelectedDocumentId("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle rule category selection for context
  const handleSelectCategory = (category: RuleCategory) => {
    const rulesText = category.rules
      .map(r => `${r.title}: ${typeof r.content === 'object' && r.content !== null && 'text' in r.content ? (r.content as {text?: string}).text : JSON.stringify(r.content)}`)
      .join('\n');
    setSelectedRulesContext(`[Rules from category "${category.category}"]\n${rulesText}`);
    toast.success(`Loaded ${category.ruleCount} rules from "${category.category}"`);
  };

  // Handle single rule selection
  const handleSelectRule = (rule: WargameRule) => {
    const ruleText = typeof rule.content === 'object' && rule.content !== null && 'text' in rule.content 
      ? (rule.content as {text?: string}).text 
      : JSON.stringify(rule.content);
    setSelectedRulesContext(`[Rule: ${rule.title}]\n${ruleText}`);
    toast.success(`Loaded rule "${rule.title}"`);
  };

  // Create component directly from category
  const handleCreateFromCategory = async (category: RuleCategory, type: "table" | "card") => {
    const prompt = type === "table" 
      ? `Create a table widget from all the rules in the "${category.category}" category. Include Name and Effect columns.`
      : `Create card widgets for each rule in the "${category.category}" category.`;
    
    // Set context and auto-send
    handleSelectCategory(category);
    setInput(prompt);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-primary/30 max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-primary font-mono uppercase tracking-wider flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Component Builder
          </DialogTitle>
        </DialogHeader>

        {/* Source Tabs: Rules Browser & Documents */}
        <div className="border-b border-border">
          <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as "documents" | "rules")} className="w-full">
            <div className="px-4 py-2 bg-muted/30">
              <TabsList className="h-8">
                <TabsTrigger value="rules" className="text-xs gap-1.5">
                  <Book className="w-3 h-3" />
                  Campaign Rules
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs gap-1.5">
                  <FolderOpen className="w-3 h-3" />
                  Documents
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="rules" className="px-4 py-2 m-0 max-h-[180px] overflow-auto">
              <RulesCategoryBrowser
                campaignId={campaignId}
                onSelectCategory={handleSelectCategory}
                onSelectRule={handleSelectRule}
                onCreateFromCategory={handleCreateFromCategory}
              />
              {selectedRulesContext && (
                <div className="mt-2 flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded">
                  <Book className="w-3 h-3" />
                  <span className="truncate">Rules context loaded</span>
                  <button 
                    onClick={() => setSelectedRulesContext("")} 
                    className="hover:text-destructive ml-auto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="px-4 py-2 m-0">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {/* Saved Documents Dropdown */}
                {campaignDocuments.length > 0 && !fileName && (
                  <Select
                    value={selectedDocumentId}
                    onValueChange={handleSelectSavedDocument}
                    disabled={isLoadingDocument}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs bg-input border-border">
                      <FolderOpen className="w-3 h-3 mr-2" />
                      <SelectValue placeholder="Saved documents" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignDocuments.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{doc.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {fileName ? (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded">
                    {isLoadingDocument ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <FileText className="w-3 h-3" />
                    )}
                    <span className="truncate max-w-[150px]">{fileName}</span>
                    <button onClick={clearFile} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 border border-dashed border-border rounded hover:border-primary/50"
                  >
                    <Upload className="w-3 h-3" />
                    Upload New
                  </button>
                )}

                <div className="flex-1 min-w-[150px] relative">
                  <Link className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="Or paste a URL..."
                    className="w-full pl-7 pr-3 py-1.5 bg-input border border-border rounded text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Bot className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm font-mono mb-2">How can I help you create components?</p>
              <p className="text-xs max-w-md">
                Browse your campaign rules or upload a document, then ask me to create tables or cards.
              </p>
              
              {/* Smart Suggestions */}
              {getSuggestions().length > 0 && (
                <div className="mt-4 w-full max-w-md">
                  <p className="text-xs text-primary/70 mb-2 flex items-center gap-1 justify-center">
                    <Sparkles className="w-3 h-3" />
                    Suggested actions:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {getSuggestions().map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {getSuggestions().length === 0 && (
                <div className="mt-4 space-y-2 text-xs text-left">
                  <p className="text-primary/70">Try saying:</p>
                  <p className="italic">"Create a table from the Injury rules"</p>
                  <p className="italic">"Build reference cards for all equipment"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing...</span>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>

                    {/* Component Cards */}
                    {message.components && message.components.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.components.map((component, index) => (
                          <div
                            key={index}
                            className={`border rounded-lg p-3 bg-card ${
                              component.created ? "border-green-500/50 bg-green-500/5" : "border-primary/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {component.type === "table" ? (
                                  <Table className="w-4 h-4 text-primary" />
                                ) : (
                                  <LayoutList className="w-4 h-4 text-primary" />
                                )}
                                <span className="font-mono text-sm text-primary">
                                  {component.data.title}
                                </span>
                                {component.created && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              
                              {!component.created && (
                                <TerminalButton
                                  size="sm"
                                  onClick={() => handleCreateComponent(message.id, index)}
                                  disabled={createComponent.isPending}
                                  className="text-xs py-1 px-2"
                                >
                                  Create
                                </TerminalButton>
                              )}
                            </div>

                            {/* Preview snippet */}
                            <div className="text-xs text-muted-foreground">
                              {"columns" in component.data && component.data.columns && component.data.rows ? (
                                <span>{component.data.rows.length} rows × {component.data.columns.length} columns</span>
                              ) : "cards" in component.data && component.data.cards ? (
                                <span>{component.data.cards.length} cards</span>
                              ) : (
                                <span>Component ready</span>
                              )}
                            </div>
                          </div>
                        ))}

                        {message.components.filter(c => !c.created).length > 1 && (
                          <TerminalButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateAllComponents(message.id)}
                            disabled={createComponent.isPending}
                            className="w-full text-xs"
                          >
                            Create All Components
                          </TerminalButton>
                        )}
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what components you want to create..."
              className="flex-1 min-h-[44px] max-h-[120px] px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              rows={1}
            />
            <TerminalButton
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </TerminalButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
