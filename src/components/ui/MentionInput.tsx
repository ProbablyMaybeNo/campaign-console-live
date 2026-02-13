import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MentionOption {
  id: string;
  name: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect: (userId: string) => void;
  options: MentionOption[];
  placeholder?: string;
  className?: string;
  selectedRecipient?: string | null;
}

export function MentionInput({
  value,
  onChange,
  onMentionSelect,
  options,
  placeholder = "Type @ to mention someone...",
  className,
  selectedRecipient,
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(filterText.toLowerCase())
  );

  useEffect(() => {
    // Check for @ symbol and show dropdown
    const atIndex = value.lastIndexOf("@");
    if (atIndex !== -1 && atIndex === value.length - 1 - filterText.length) {
      const textAfterAt = value.slice(atIndex + 1);
      if (!textAfterAt.includes(" ")) {
        setFilterText(textAfterAt);
        setShowDropdown(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowDropdown(false);
    setFilterText("");
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelectOption(filteredOptions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleSelectOption = (option: MentionOption) => {
    const atIndex = value.lastIndexOf("@");
    const newValue = value.slice(0, atIndex) + `@${option.name} `;
    onChange(newValue);
    onMentionSelect(option.id);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const selectedRecipientName = selectedRecipient 
    ? options.find(o => o.id === selectedRecipient)?.name 
    : null;

  return (
    <div className="relative">
      {/* Selected recipient badge */}
      {selectedRecipientName && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">To:</span>
          <span 
            className="px-2 py-0.5 rounded text-xs font-mono"
            style={{ 
              backgroundColor: "hsl(200, 100%, 70%, 0.2)",
              color: "hsl(200, 100%, 70%)",
              border: "1px solid hsl(200, 100%, 70%, 0.4)"
            }}
          >
            @{selectedRecipientName}
          </span>
        </div>
      )}
      
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-primary/30 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none font-mono",
          className
        )}
      />

      {/* Mention dropdown */}
      {showDropdown && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 w-full mb-1 z-50 border rounded-md shadow-lg overflow-hidden"
          style={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(200, 100%, 70%, 0.4)",
            boxShadow: "0 0 15px hsl(200 100% 70% / 0.2), 0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <div className="max-h-[200px] overflow-y-auto">
            {filteredOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm font-mono transition-colors",
                  index === selectedIndex
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <span style={{ color: "hsl(200, 100%, 70%)" }}>@</span>
                <span style={{ color: "hsl(142, 76%, 65%)" }}>{option.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
