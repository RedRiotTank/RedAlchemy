import { useState, useEffect, useRef } from "preact/hooks";
import Canvas from "./Canvas.preact";
import ElementsPanel from "./ElementsPanel.preact";
import {
  fetchBaseElements,
  fuseElements,
  generateInstanceId,
} from "../../lib/alchemy";
import type { AlchemyElement, CanvasElement } from "../../lib/alchemy";

export default function Game() {
  const [elements, setElements] = useState<AlchemyElement[]>([]);
  const [discovered, setDiscovered] = useState<AlchemyElement[]>([]);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [discovery, setDiscovery] = useState<{
    element: AlchemyElement;
    show: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ghostElementRef = useRef<HTMLDivElement | null>(null);
  const draggingFromPanelRef = useRef<AlchemyElement | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadElements = async () => {
      try {
        setIsLoading(true);
        const base = await fetchBaseElements();
        setElements(base);
        setDiscovered(base);
      } catch (error) {
        console.error("Error loading elements:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadElements();
  }, []);

  const handleDiscovery = (newElement: AlchemyElement) => {
    setDiscovered((prev) => [...prev, newElement]);
    setElements((prev) => [...prev, newElement]);

    // Agregar nuevo elemento al canvas con instanceId único
    setCanvasElements((prev) => [
      ...prev,
      {
        ...newElement,
        x: window.innerWidth / 2 - 50,
        y: window.innerHeight / 2 - 50,
        instanceId: generateInstanceId(),
      } as CanvasElement,
    ]);
  };

  const handleFusion = async (
    elementA: CanvasElement,
    elementB: CanvasElement
  ) => {
    return await fuseElements(elementA, elementB);
  };

  // Iniciar arrastre desde el panel
  const handleStartDragFromPanel = (element: AlchemyElement, e: MouseEvent) => {
    draggingFromPanelRef.current = element;

    // Crear elemento fantasma
    ghostElementRef.current = document.createElement("div");
    ghostElementRef.current.className =
      "fixed text-4xl z-50 pointer-events-none";
    ghostElementRef.current.textContent = element.emoji;
    ghostElementRef.current.style.left = `${e.clientX - 24}px`;
    ghostElementRef.current.style.top = `${e.clientY - 24}px`;
    document.body.appendChild(ghostElementRef.current);

    // Agregar listeners globales
    window.addEventListener("mousemove", handleGhostMouseMove);
    window.addEventListener("mouseup", handleGhostMouseUp);
  };

  // Mover elemento fantasma
  const handleGhostMouseMove = (e: MouseEvent) => {
    if (ghostElementRef.current) {
      ghostElementRef.current.style.left = `${e.clientX - 24}px`;
      ghostElementRef.current.style.top = `${e.clientY - 24}px`;
    }
  };

  // Soltar elemento fantasma
  const handleGhostMouseUp = (e: MouseEvent) => {
    if (!draggingFromPanelRef.current || !canvasRef.current) return;

    // Verificar si se soltó sobre el canvas
    const canvasRect = canvasRef.current.getBoundingClientRect();
    if (
      e.clientX >= canvasRect.left &&
      e.clientX <= canvasRect.right &&
      e.clientY >= canvasRect.top &&
      e.clientY <= canvasRect.bottom
    ) {
      // Agregar al canvas con instanceId único
      setCanvasElements((prev) => [
        ...prev,
        {
          ...draggingFromPanelRef.current,
          x: e.clientX - canvasRect.left - 24,
          y: e.clientY - canvasRect.top - 24,
          instanceId: generateInstanceId(),
        } as CanvasElement,
      ]);
    }

    // Limpiar
    if (ghostElementRef.current) {
      document.body.removeChild(ghostElementRef.current);
      ghostElementRef.current = null;
    }
    draggingFromPanelRef.current = null;

    // Remover listeners
    window.removeEventListener("mousemove", handleGhostMouseMove);
    window.removeEventListener("mouseup", handleGhostMouseUp);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-2xl text-yellow-400">Cargando elementos...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 h-full">
        <div ref={canvasRef} className="flex-1">
          <Canvas
            elements={canvasElements}
            setElements={setCanvasElements}
            onFusion={handleFusion}
            onDiscovery={handleDiscovery}
          />
        </div>
        <div className="w-80 bg-gray-800 border-l border-gray-700">
          <ElementsPanel
            elements={discovered}
            onStartDrag={handleStartDragFromPanel}
          />
        </div>
      </div>

      {discovery?.show && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-gray-800 border-2 border-yellow-400 p-6 rounded-xl text-center animate-pingOnce">
            <p className="text-3xl text-yellow-400 mb-2">
              ¡Nuevo Descubrimiento!
            </p>
            <p className="text-2xl">
              {discovery.element.emoji} {discovery.element.name}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
