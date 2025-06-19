type ElementInfo = {
  name: string;
  emoji: string;
  uuid: string;
};

const API_BASE = "https://redalchemy.redriottank.com/api";

const baseElements = new Set<string>();
const discovered = new Set<string>();
const panel = document.getElementById("elements-panel")!;
const canvas = document.getElementById("combination-canvas")!;
const instructions = document.getElementById("canvas-instructions")!;
const alertBox = document.getElementById("discovery-alert")!;
const alertName = document.getElementById("discovered-element")!;
let hoverCircle: HTMLDivElement | null = null;

async function loadBaseElements() {
  try {
    const response = await fetch(`${API_BASE}/elements/base`);
    const elements: ElementInfo[] = await response.json();

    elements.forEach((element) => {
      baseElements.add(element.uuid);
      discovered.add(element.name.toLowerCase());
    });
  } catch (error) {
    console.error("Error loading base elements:", error);
  }
}

loadBaseElements();

function normalizeKey(a: string, b: string) {
  return [a, b].sort().join("+");
}

function createCanvasElement(
  name: string,
  emoji: string,
  x: number,
  y: number,
  uuid: string
): HTMLDivElement {
  const el = document.createElement("div");
  el.className =
    "absolute bg-gray-800 border border-gray-600 px-4 py-2 rounded-lg cursor-move select-none text-xl flex items-center gap-2";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.dataset.element = name;
  el.dataset.uuid = uuid;

  el.innerHTML = `<span class="text-2xl">${emoji}</span><span class="capitalize">${name}</span>`;
  makeDraggableInCanvas(el);
  canvas.appendChild(el);
  return el;
}

function makeDraggableInCanvas(el: HTMLDivElement) {
  let offsetX = 0,
    offsetY = 0;

  el.onmousedown = (e) => {
    const rect = canvas.getBoundingClientRect();
    offsetX = e.clientX - rect.left - el.offsetLeft;
    offsetY = e.clientY - rect.top - el.offsetTop;

    const onMove = (ev: MouseEvent) => {
      const currentX = ev.pageX - canvas.offsetLeft - offsetX;
      const currentY = ev.pageY - canvas.offsetTop - offsetY;

      el.style.left = `${currentX}px`;
      el.style.top = `${currentY}px`;

      showHoverIfNear(el);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      const fusionTarget = getNearElement(el);
      if (fusionTarget) {
        tryFusion(el, fusionTarget);
      }
      removeHoverCircle();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
}

function showHoverIfNear(draggingEl: HTMLDivElement) {
  const target = getNearElement(draggingEl);
  if (target) {
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
  hoverCircle?.remove();
  hoverCircle = null;
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
    const distance = Math.hypot(dx, dy);

    if (distance < 50) return other;
  }

  return null;
}

async function tryFusion(elA: HTMLDivElement, elB: HTMLDivElement) {
  const uuidA = elA.dataset.uuid!;
  const uuidB = elB.dataset.uuid!;

  try {
    const response = await fetch(
      `${API_BASE}/fusion?id1=${uuidA}&id2=${uuidB}`
    );

    if (!response.ok) {
      console.log("No fusion possible for these elements");
      return;
    }

    const result: ElementInfo & { id: string; icon: string } =
      await response.json();
    const resultName = result.name.toLowerCase();

    if (discovered.has(resultName)) {
      console.log("Element already discovered:", resultName);
      return;
    }

    discovered.add(resultName);
    elA.remove();
    elB.remove();

    createCanvasElement(
      resultName,
      result.icon,
      parseInt(elA.style.left) + 40,
      parseInt(elA.style.top) + 40,
      result.id
    );

    createPanelElement(resultName, result.icon, result.id);

    alertName.textContent = `${result.icon} ${result.name}`;
    alertBox.classList.remove("hidden");
    setTimeout(() => alertBox.classList.add("hidden"), 2000);
  } catch (error) {
    console.error("Error checking fusion:", error);
  }
}

function setDragData(e: DragEvent, name: string, uuid: string) {
  e.dataTransfer?.setData("text/plain", name);
  e.dataTransfer?.setData("uuid", uuid);
}

function createPanelElement(name: string, emoji: string, uuid: string) {
  const el = document.createElement("div");
  el.dataset.element = name;
  el.dataset.uuid = uuid;
  el.className =
    "bg-gray-800 border border-gray-600 px-5 py-3 rounded-lg cursor-grab select-none text-xl flex items-center gap-2";
  el.draggable = true;
  el.innerHTML = `<span class="text-2xl">${emoji}</span><span class="capitalize">${name}</span>`;

  el.addEventListener("dragstart", (e) => setDragData(e, name, uuid));

  panel.appendChild(el);
}

panel.querySelectorAll<HTMLElement>("[data-element]").forEach((el) => {
  el.addEventListener("dragstart", (e) =>
    setDragData(e, el.dataset.element!, el.dataset.uuid!)
  );
});

canvas.addEventListener("dragover", (e) => e.preventDefault());

canvas.addEventListener("drop", (e) => {
  e.preventDefault();
  const name = e.dataTransfer?.getData("text/plain");
  const uuid = e.dataTransfer?.getData("uuid");

  if (!name || !uuid) return;

  const el = panel.querySelector(`[data-element="${name}"]`);
  const emoji = el?.querySelector("span")?.textContent || "❓";

  instructions.classList.add("hidden");

  const canvasRect = canvas.getBoundingClientRect();
  const rawX = e.clientX - canvasRect.left;
  const rawY = e.clientY - canvasRect.top;

  const temp = document.createElement("div");
  temp.className =
    "absolute bg-gray-800 border border-gray-600 px-4 py-2 rounded-lg cursor-move select-none text-xl flex items-center gap-2";
  temp.style.visibility = "hidden";
  temp.innerHTML = `<span class="text-2xl">${emoji}</span><span class="capitalize">${name}</span>`;
  canvas.appendChild(temp);

  const offsetX = temp.offsetWidth / 2;
  const offsetY = temp.offsetHeight / 2;
  temp.remove();

  createCanvasElement(name, emoji, rawX - offsetX, rawY - offsetY, uuid);
});
