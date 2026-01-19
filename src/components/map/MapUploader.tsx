import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X } from 'lucide-react';
import { TerminalButton } from '@/components/ui/TerminalButton';
import { TerminalInput } from '@/components/ui/TerminalInput';

interface MapUploaderProps {
  onUpload: (imageUrl: string) => void;
  isLoading?: boolean;
}

export function MapUploader({ onUpload, isLoading }: MapUploaderProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview and convert to base64 for storage
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      setPreview(urlValue.trim());
      setShowUrlInput(false);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onUpload(preview);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setUrlValue('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="relative border border-border rounded-lg overflow-hidden bg-muted/30">
          <img 
            src={preview} 
            alt="Map preview" 
            className="w-full h-64 object-contain"
            onError={() => {
              setPreview(null);
            }}
          />
          <button
            onClick={handleCancel}
            className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <TerminalButton variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </TerminalButton>
          <TerminalButton size="sm" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Uploading...' : 'Use This Map'}
          </TerminalButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
      <Upload className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium mb-2">Upload Campaign Map</p>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        Upload an image file or paste a URL to your campaign territory map
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {showUrlInput ? (
        <div className="flex gap-2 w-full max-w-md">
          <TerminalInput
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://example.com/map.jpg"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <TerminalButton size="sm" onClick={handleUrlSubmit}>
            Load
          </TerminalButton>
          <TerminalButton variant="outline" size="sm" onClick={() => setShowUrlInput(false)}>
            Cancel
          </TerminalButton>
        </div>
      ) : (
        <div className="flex gap-3">
          <TerminalButton onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Choose File
          </TerminalButton>
          <TerminalButton variant="outline" onClick={() => setShowUrlInput(true)}>
            <LinkIcon className="w-4 h-4 mr-2" />
            Paste URL
          </TerminalButton>
        </div>
      )}
    </div>
  );
}
