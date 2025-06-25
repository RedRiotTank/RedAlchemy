import { useRef, useState, useEffect } from "preact/hooks";
import Element from "./Element.preact";
import type { CanvasElement, AlchemyElement } from "../../lib/alchemy";

interface CanvasProps {
  elements: CanvasElement[];
  setElements: (elements: CanvasElement[]) => void;
  onFusion: (
    a: CanvasElement,
    b: CanvasElement
  ) => Promise<AlchemyElement | null>;
  onDiscovery: (element: AlchemyElement) => void;
}

export default function Canvas({
  elements,
  setElements,
  onFusion,
  onDiscovery,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });
  const animationFrame = useRef<number | null>(null);
  const proximityCheck = useRef(0);

  // Usaremos requestAnimationFrame para actualizaciones suaves
  const handleMouseDown = (id: string, e: globalThis.MouseEvent) => {
    const element = elements.find((el) => el.id === id);
    if (!element || !canvasRef.current) return;

    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();

    // Calcular offset relativo al punto de clic dentro del elemento
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setDraggingId(id);
    lastPosition.current = { x: element.x, y: element.y };

    // Cancelar cualquier animación pendiente
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;

    // Usar requestAnimationFrame para mejor rendimiento
    if (!animationFrame.current) {
      animationFrame.current = requestAnimationFrame(() => {
        const canvasRect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - canvasRect.left - dragOffset.current.x;
        const y = e.clientY - canvasRect.top - dragOffset.current.y;

        // Actualizar posición solo del elemento arrastrado
        const updatedElements = elements.map((el) =>
          el.id === draggingId ? { ...el, x, y } : el
        );

        // Actualizar estado solo si es necesario
        if (x !== lastPosition.current.x || y !== lastPosition.current.y) {
          setElements(updatedElements);
          lastPosition.current = { x, y };
        }

        // Verificar fusiones (con throttling)
        if (Date.now() - proximityCheck.current > 50) {
          const currentElement = elements.find((el) => el.id === draggingId);
          if (currentElement) {
            const nearElement = findNearElement(
              { ...currentElement, x, y },
              elements.filter((el) => el.id !== draggingId)
            );
            setHoverTarget((prev) =>
              nearElement?.id === prev ? prev : nearElement?.id || null
            );
          }
          proximityCheck.current = Date.now();
        }

        animationFrame.current = null;
      });
    }
  };

  const handleMouseUp = async (e: globalThis.MouseEvent) => {
    if (!draggingId) return;

    // Limpiar listeners
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);

    if (hoverTarget) {
      const elementA = elements.find((el) => el.id === draggingId);
      const elementB = elements.find((el) => el.id === hoverTarget);

      if (elementA && elementB) {
        const result = await onFusion(elementA, elementB);
        if (result) {
          // Eliminar elementos fusionados
          const filteredElements = elements.filter(
            (el) => el.id !== elementA.id && el.id !== elementB.id
          );
          setElements(filteredElements);

          // Agregar nuevo elemento
          onDiscovery(result);
        }
      }
    }

    setDraggingId(null);
    setHoverTarget(null);

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  };

  // Función auxiliar para encontrar elementos cercanos (optimizada)
  const findNearElement = (
    current: CanvasElement,
    elements: CanvasElement[]
  ): CanvasElement | undefined => {
    const radius = 60;
    const radiusSquared = radius * radius;

    return elements.find((el) => {
      const dx = el.x - current.x;
      const dy = el.y - current.y;
      return dx * dx + dy * dy < radiusSquared;
    });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: globalThis.MouseEvent) =>
      handleMouseMove(e);
    const handleGlobalMouseUp = (e: globalThis.MouseEvent) => handleMouseUp(e);

    if (draggingId) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);

      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    };
  }, [draggingId, elements, hoverTarget]);

  return (
    <div
      ref={canvasRef}
      className="h-full w-full bg-gray-800 relative overflow-hidden canvas-area"
    >
      {elements.map((element) => (
        <Element
          key={element.id}
          element={element}
          onMouseDown={handleMouseDown}
          isDragging={draggingId === element.id}
          isHoverTarget={hoverTarget === element.id}
        />
      ))}

      {hoverTarget && (
        <div
          className="absolute w-16 h-16 border-4 border-yellow-400 rounded-full pointer-events-none"
          style={{
            transform: `translate(${
              elements.find((e) => e.id === hoverTarget)!.x - 8
            }px, ${elements.find((e) => e.id === hoverTarget)!.y - 8}px)`,
            willChange: "transform",
          }}
        />
      )}
    </div>
  );
}
