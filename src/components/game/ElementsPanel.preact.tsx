import type { AlchemyElement } from "../../lib/alchemy";

interface ElementsPanelProps {
  elements: AlchemyElement[];
  onStartDrag: (element: AlchemyElement, e: MouseEvent) => void;
}

export default function ElementsPanel({
  elements,
  onStartDrag,
}: ElementsPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold p-3 text-yellow-400 border-b border-gray-700">
        Elements
      </h2>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2">
        {elements.map((element) => (
          <div
            key={element.id}
            className="bg-gray-700 border border-gray-600 rounded-md p-2 cursor-pointer hover:bg-gray-600 transition-colors flex items-center"
            onMouseDown={(e) =>
              onStartDrag(element, e as unknown as MouseEvent)
            }
          >
            <span className="text-xl mr-1">{element.emoji}</span>
            <span className="capitalize text-xs truncate">{element.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
