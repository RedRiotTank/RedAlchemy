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
  onDiscovery: (
    element: AlchemyElement,
    position?: { x: number; y: number }
  ) => void;
}

export default function Canvas({
  elements,
  setElements,
  onFusion,
  onDiscovery,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingInstanceId, setDraggingInstanceId] = useState<string | null>(
    null
  );
  const [hoverTargetInstanceId, setHoverTargetInstanceId] = useState<
    string | null
  >(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });
  const animationFrame = useRef<number | null>(null);
  const proximityCheck = useRef(0);

  const handleMouseDown = (instanceId: string, e: MouseEvent) => {
    const element = elements.find((el) => el.instanceId === instanceId);
    if (!element || !canvasRef.current) return;

    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();

    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setDraggingInstanceId(instanceId);
    lastPosition.current = { x: element.x, y: element.y };

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingInstanceId || !canvasRef.current) return;

    if (!animationFrame.current) {
      animationFrame.current = requestAnimationFrame(() => {
        const canvasRect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - canvasRect.left - dragOffset.current.x;
        const y = e.clientY - canvasRect.top - dragOffset.current.y;

        const updatedElements = elements.map((el) =>
          el.instanceId === draggingInstanceId ? { ...el, x, y } : el
        );

        if (x !== lastPosition.current.x || y !== lastPosition.current.y) {
          setElements(updatedElements);
          lastPosition.current = { x, y };
        }

        if (Date.now() - proximityCheck.current > 50) {
          const currentElement = elements.find(
            (el) => el.instanceId === draggingInstanceId
          );
          if (currentElement) {
            const nearElement = findNearElement(
              { ...currentElement, x, y },
              elements.filter((el) => el.instanceId !== draggingInstanceId)
            );

            setHoverTargetInstanceId(nearElement?.instanceId || null);
          }
          proximityCheck.current = Date.now();
        }

        animationFrame.current = null;
      });
    }
  };

  const handleMouseUp = async (e: MouseEvent) => {
    if (!draggingInstanceId) return;

    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);

    if (hoverTargetInstanceId) {
      const elementA = elements.find(
        (el) => el.instanceId === draggingInstanceId
      );
      const elementB = elements.find(
        (el) => el.instanceId === hoverTargetInstanceId
      );

      if (elementA && elementB) {
        const result = await onFusion(elementA, elementB);
        if (result) {
          const filteredElements = elements.filter(
            (el) =>
              el.instanceId !== elementA.instanceId &&
              el.instanceId !== elementB.instanceId
          );
          setElements(filteredElements);

          onDiscovery(result, { x: elementB.x, y: elementB.y });
        }
      }
    }

    setDraggingInstanceId(null);
    setHoverTargetInstanceId(null);

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  };

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
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = (e: MouseEvent) => handleMouseUp(e);

    if (draggingInstanceId) {
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
  }, [draggingInstanceId, elements, hoverTargetInstanceId]);

  return (
    <div
      ref={canvasRef}
      className="h-full w-full bg-gray-800 relative overflow-hidden canvas-area"
    >
      {elements.map((element) => (
        <Element
          key={element.instanceId}
          element={element}
          onMouseDown={handleMouseDown}
          isDragging={draggingInstanceId === element.instanceId}
          isHoverTarget={hoverTargetInstanceId === element.instanceId}
        />
      ))}

      {hoverTargetInstanceId && (
        <div
          className="absolute w-16 h-16 border-4 border-yellow-400 rounded-full pointer-events-none"
          style={{
            transform: `translate(${
              elements.find((e) => e.instanceId === hoverTargetInstanceId)!.x -
              8
            }px, ${
              elements.find((e) => e.instanceId === hoverTargetInstanceId)!.y -
              8
            }px)`,
            willChange: "transform",
          }}
        />
      )}
    </div>
  );
}
