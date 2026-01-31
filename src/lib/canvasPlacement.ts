export type CanvasTransformSnapshot = {
  scale: number;
  positionX: number;
  positionY: number;
  viewportWidth: number;
  viewportHeight: number;
  updatedAt: number;
};

function storageKey(campaignId: string) {
  return `canvas-transform:${campaignId}`;
}

export function writeCanvasTransform(
  campaignId: string,
  snapshot: Omit<CanvasTransformSnapshot, "updatedAt"> & { updatedAt?: number }
) {
  try {
    const full: CanvasTransformSnapshot = {
      ...snapshot,
      updatedAt: snapshot.updatedAt ?? Date.now(),
    };
    sessionStorage.setItem(storageKey(campaignId), JSON.stringify(full));
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

export function readCanvasTransform(campaignId: string): CanvasTransformSnapshot | null {
  try {
    const raw = sessionStorage.getItem(storageKey(campaignId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CanvasTransformSnapshot>;

    if (
      typeof parsed.scale !== "number" ||
      typeof parsed.positionX !== "number" ||
      typeof parsed.positionY !== "number" ||
      typeof parsed.viewportWidth !== "number" ||
      typeof parsed.viewportHeight !== "number"
    ) {
      return null;
    }

    return {
      scale: parsed.scale,
      positionX: parsed.positionX,
      positionY: parsed.positionY,
      viewportWidth: parsed.viewportWidth,
      viewportHeight: parsed.viewportHeight,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function getCenteredPlacement(
  campaignId: string,
  width: number,
  height: number,
  fallback: { x: number; y: number } = { x: 100, y: 100 }
) {
  const t = readCanvasTransform(campaignId);
  if (!t || !Number.isFinite(t.scale) || t.scale <= 0) {
    return { position_x: fallback.x, position_y: fallback.y };
  }

  // Convert viewport center (screen px) into canvas coordinates.
  const centerCanvasX = (t.viewportWidth / 2 - t.positionX) / t.scale;
  const centerCanvasY = (t.viewportHeight / 2 - t.positionY) / t.scale;

  return {
    position_x: Math.round(centerCanvasX - width / 2),
    position_y: Math.round(centerCanvasY - height / 2),
  };
}
