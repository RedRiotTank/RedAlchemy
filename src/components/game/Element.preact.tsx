import type { CanvasElement } from "../../lib/alchemy";

interface ElementProps {
  element: CanvasElement;
  onMouseDown: (id: string, e: MouseEvent) => void;
  isDragging: boolean;
  isHoverTarget: boolean;
}

export default function Element({
  element,
  onMouseDown,
  isDragging,
  isHoverTarget,
}: ElementProps) {
  return (
    <div
      data-canvas-id={element.id}
      className={`absolute rounded-full cursor-move select-none shadow-lg flex items-center justify-center
        ${
          isDragging
            ? "border-4 border-yellow-400 opacity-90 z-10 shadow-xl"
            : "border-2 border-gray-600 z-auto"
        }
        ${isHoverTarget ? "ring-4 ring-yellow-400 ring-opacity-70" : ""}
      `}
      style={{
        transform: `translate(${element.x}px, ${element.y}px) scale(${
          isDragging ? 1.2 : 1
        })`,
        width: "60px",
        height: "60px",
        fontSize: "2.5rem",
        willChange: "transform",
        background: "rgba(55, 65, 81, 0.7)",
        transition: isDragging
          ? "none"
          : "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(element.id, e as unknown as MouseEvent);
      }}
    >
      {element.emoji}
    </div>
  );
}
