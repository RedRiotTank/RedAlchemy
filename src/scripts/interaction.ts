type ElementInfo = {
  name: string;
  emoji: string;
};

const baseElements = ["water", "fire", "dirt", "air"];
const combinations: Record<string, ElementInfo> = {
  "water+fire": { name: "steam", emoji: "💨" },
  "water+dirt": { name: "mud", emoji: "🪵" },
};

const discovered = new Set(baseElements);
const panel = document.getElementById("elements-panel")!;
const canvas = document.getElementById("combination-canvas")!;
const instructions = document.getElementById("canvas-instructions")!;
const alertBox = document.getElementById("discovery-alert")!;
const alertName = document.getElementById("discovered-element")!;
let hoverCircle: HTMLDivElement | null = null;

function normalizeKey(a: string, b: string) {
  return [a, b].sort().join("+");
}

function createCanvasElement(
  name: string,
  emoji: string,
  x: number,
  y: number
): HTMLDivElement {
  const el = document.createElement("div");
  el.className =
    "absolute bg-gray-800 border border-gray-600 px-4 py-2 rounded-lg cursor-move select-none text-xl flex items-center gap-2";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.dataset.element = name;

  el.innerHTML = `<span class="text-2xl">${emoji}</span><span class="capitalize">${name}</span>`;
  makeDraggableInCanvas(el);
  canvas.appendChild(el);
  return el;
}

function makeDraggableInCanvas(el: HTMLDivElement) {
  let offsetX = 0,
    offsetY = 0;
  let currentX = 0,
    currentY = 0;

  el.onmousedown = (e) => {
    offsetX = e.offsetX;
    offsetY = e.offsetY;

    function onMove(ev: MouseEvent) {
      currentX = ev.pageX - canvas.offsetLeft - offsetX;
      currentY = ev.pageY - canvas.offsetTop - offsetY;

      el.style.left = `${currentX}px`;
      el.style.top = `${currentY}px`;

      showHoverIfNear(el);
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      const fusionTarget = getNearElement(el);
      if (fusionTarget) {
        tryFusion(el, fusionTarget);
      }
      removeHoverCircle();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
}

function showHoverIfNear(draggingEl: HTMLDivElement) {
  const target = getNearElement(draggingEl);
  if (target) {
    const rect = target.getBoundingClientRect();
    if (!hoverCircle) {
      hoverCircle = document.createElement("div");
      hoverCircle.className =
        "absolute w-16 h-16 rounded-full border-4 border-yellow-400 opacity-70 pointer-events-none";
      canvas.appendChild(hoverCircle);
    }
    hoverCircle.style.left = `${target.offsetLeft - 8}px`;
    hoverCircle.style.top = `${target.offsetTop - 8}px`;
  } else {
    removeHoverCircle();
  }
}

function removeHoverCircle() {
  if (hoverCircle) {
    hoverCircle.remove();
    hoverCircle = null;
  }
}

function getNearElement(el: HTMLDivElement): HTMLDivElement | null {
  const others = [
    ...canvas.querySelectorAll<HTMLDivElement>("[data-element]"),
  ].filter((e) => e !== el);
  const rect1 = el.getBoundingClientRect();

  for (const other of others) {
    const rect2 = other.getBoundingClientRect();
    const dx = rect1.left - rect2.left;
    const dy = rect1.top - rect2.top;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 50) return other;
  }

  return null;
}

function tryFusion(elA: HTMLDivElement, elB: HTMLDivElement) {
  const nameA = elA.dataset.element!;
  const nameB = elB.dataset.element!;
  const comboKey = normalizeKey(nameA, nameB);
  const result = combinations[comboKey];

  if (!result || discovered.has(result.name)) return;

  discovered.add(result.name);
  elA.remove();
  elB.remove();

  createCanvasElement(
    result.name,
    result.emoji,
    parseInt(elA.style.left) + 40,
    parseInt(elA.style.top) + 40
  );
  createPanelElement(result.name, result.emoji);

  alertName.textContent = `${result.emoji} ${result.name}`;
  alertBox.classList.remove("hidden");
  setTimeout(() => alertBox.classList.add("hidden"), 2000);
}

function createPanelElement(name: string, emoji: string) {
  const el = document.createElement("div");
  el.dataset.element = name;
  el.className =
    "bg-gray-800 border border-gray-600 px-5 py-3 rounded-lg cursor-grab select-none text-xl flex items-center gap-2";
  el.draggable = true;
  el.innerHTML = `<span class="text-2xl">${emoji}</span><span class="capitalize">${name}</span>`;
  el.addEventListener("dragstart", (e) => {
    e.dataTransfer?.setData("text/plain", name);
  });
  panel.appendChild(el);
}

panel.querySelectorAll<HTMLElement>("[data-element]").forEach((el) => {
  el.addEventListener("dragstart", (e) => {
    e.dataTransfer?.setData("text/plain", el.dataset.element!);
  });
});

canvas.addEventListener("dragover", (e) => e.preventDefault());

canvas.addEventListener("drop", (e) => {
  e.preventDefault();
  const name = e.dataTransfer?.getData("text/plain");
  if (!name) return;

  const el = panel.querySelector(`[data-element="${name}"]`);
  const emoji = el?.querySelector("span")?.textContent || "❓";

  instructions.classList.add("hidden");

  createCanvasElement(name, emoji, e.offsetX, e.offsetY);
});
