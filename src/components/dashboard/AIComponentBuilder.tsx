import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { useCreateComponent } from "@/hooks/useDashboardComponents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  LayoutList
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

export function AIComponentBuilder({ open, onOpenChange, campaignId }: AIComponentBuilderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const createComponent = useCreateComponent();

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

    setFileName(file.name);

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      setSourceContent(text);
      toast.success(`Loaded ${file.name}`);
      return;
    }

    if (file.type === "application/pdf") {
      toast.info("PDF uploaded. The AI will extract content from it.");
      const reader = new FileReader();
      reader.onload = () => {
        setSourceContent(`[PDF Content from: ${file.name}]`);
      };
      reader.readAsDataURL(file);
      return;
    }

    toast.error("Unsupported file type. Please use .txt, .md, or .pdf files.");
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

      const { data, error } = await supabase.functions.invoke("ai-component-builder", {
        body: {
          prompt: trimmedInput,
          conversationHistory,
          sourceContent: sourceContent || undefined,
          sourceUrl: sourceUrl || undefined,
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
    onOpenChange(false);
  };

  const clearFile = () => {
    setSourceContent("");
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

        {/* Source Input Bar */}
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {fileName ? (
            <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded">
              <FileText className="w-3 h-3" />
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
              Upload PDF/Text
            </button>
          )}

          <div className="flex-1 relative">
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

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Bot className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm font-mono mb-2">How can I help you create components?</p>
              <p className="text-xs max-w-md">
                Upload a PDF or provide a URL, then ask me to extract specific tables or cards. 
                I can create multiple components at once!
              </p>
              <div className="mt-4 space-y-2 text-xs text-left">
                <p className="text-primary/70">Try saying:</p>
                <p className="italic">"List all the tables found in the post-battle sequence"</p>
                <p className="italic">"Create table components for Injury, Exploration, and Advancement"</p>
              </div>
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
                              {"columns" in component.data ? (
                                <span>{component.data.rows.length} rows × {component.data.columns.length} columns</span>
                              ) : (
                                <span>{component.data.cards.length} cards</span>
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
