const API_BASE = "https://redalchemy.redriottank.com/api";

export interface AlchemyElement {
  id: string;
  name: string;
  emoji: string;
  icon: string;
}

export interface CanvasElement extends AlchemyElement {
  x: number;
  y: number;
}

export async function fetchBaseElements(): Promise<AlchemyElement[]> {
  const response = await fetch(`${API_BASE}/elements/base`);
  const elements = await response.json();

  return elements.map((element: any) => ({
    ...element,
    emoji: element.emoji || element.icon || "❓",
  }));
}

export async function fuseElements(
  a: AlchemyElement,
  b: AlchemyElement
): Promise<AlchemyElement | null> {
  try {
    const response = await fetch(`${API_BASE}/fusion?id1=${a.id}&id2=${b.id}`);
    if (!response.ok) return null;
    const result = await response.json();

    return {
      ...result,
      emoji: result.emoji || result.icon || "❓",
    };
  } catch (error) {
    console.error("Fusion error:", error);
    return null;
  }
}
