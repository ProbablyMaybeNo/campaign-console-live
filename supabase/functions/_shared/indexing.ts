export interface ChunkOptions {
  targetSize: number;
  overlap: number;
  minSize?: number;
}

export interface ChunkResult {
  text: string;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  targetSize: 1800,
  overlap: 200,
};

function isHeadingLine(line: string): boolean {
  return (
    /^#{1,3}\s+/.test(line) ||
    /^(?:CHAPTER|PART)\s+[\dIVXLC]+/i.test(line) ||
    /^\d+\.\d*(?:\.\d+)?\s+[A-Z]/.test(line) ||
    /^[A-Z][A-Z\s]{4,50}$/.test(line)
  );
}

function splitIntoBlocks(text: string): string[] {
  const lines = text.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join("\n").trim());
      current = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }

    if (isHeadingLine(line) && current.length > 0) {
      flush();
    }

    current.push(rawLine.trimEnd());

    if (isHeadingLine(line)) {
      flush();
    }
  }

  flush();
  return blocks.filter(Boolean);
}

function splitLongBlock(block: string, targetSize: number): string[] {
  if (block.length <= targetSize) return [block];

  const sentences = block
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return [block.slice(0, targetSize), block.slice(targetSize)];
  }

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= targetSize) {
      current = next;
    } else {
      if (current) {
        chunks.push(current);
        current = sentence;
      } else {
        chunks.push(sentence.slice(0, targetSize));
        current = sentence.slice(targetSize);
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function withOverlap(chunks: string[], overlap: number): string[] {
  if (chunks.length <= 1 || overlap <= 0) return chunks;

  const result: string[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (i === 0) {
      result.push(chunk);
      continue;
    }

    const previous = result[i - 1] ?? "";
    const overlapText = previous.slice(Math.max(0, previous.length - overlap));
    const joined = `${overlapText}${chunk}`.trim();
    result.push(joined);
  }

  return result;
}

function mergeTinyChunks(chunks: string[], minSize: number, targetSize: number): string[] {
  if (chunks.length <= 1) return chunks;
  const result: string[] = [];

  for (const chunk of chunks) {
    if (chunk.length >= minSize || result.length === 0) {
      result.push(chunk);
      continue;
    }

    const previous = result[result.length - 1] ?? "";
    const merged = `${previous}\n\n${chunk}`.trim();
    if (merged.length <= targetSize) {
      result[result.length - 1] = merged;
    } else {
      result.push(chunk);
    }
  }

  return result;
}

export function buildChunksFromText(text: string, options: Partial<ChunkOptions> = {}): ChunkResult[] {
  const { targetSize, overlap, minSize } = { ...DEFAULT_OPTIONS, ...options };
  const effectiveMinSize = minSize ?? Math.max(80, Math.round(targetSize * 0.2));
  const cleaned = text.trim();
  if (!cleaned) return [];

  const blocks = splitIntoBlocks(cleaned);
  const assembled: string[] = [];
  let current = "";

  for (const block of blocks) {
    const blockParts = splitLongBlock(block, targetSize);

    for (const part of blockParts) {
      const next = current ? `${current}\n\n${part}` : part;
      if (next.length <= targetSize) {
        current = next;
      } else {
        if (current) assembled.push(current.trim());
        current = part;
      }
    }
  }

  if (current) assembled.push(current.trim());

  const merged = mergeTinyChunks(assembled, effectiveMinSize, targetSize);
  const overlapped = withOverlap(merged, overlap);
  return overlapped.map((chunk) => ({ text: chunk }));
}
