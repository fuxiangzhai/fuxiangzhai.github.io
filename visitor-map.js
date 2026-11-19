import { identifyVisitorPlaces } from "./visitor-places.js";

const previewCities = new Set(["New York", "São Paulo", "London", "Cairo", "Tokyo", "Sydney"]);
const maxZoom = 12;
const worldView = { lon: 0, lat: 12, zoom: 1 };

const grid = new Path2D();
for (let lon = -180; lon <= 180; lon += 30) {
  grid.moveTo(lon, -84);
  grid.lineTo(lon, 62);
}
for (let lat = -60; lat <= 60; lat += 30) {
  grid.moveTo(-180, lat);
  grid.lineTo(180, lat);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scaleFor(width, height, zoom, mini) {
  const inset = mini ? 6 : 36;
  return Math.max(0.03, Math.min((width - inset) / 360, (height - inset) / 150)) * zoom;
}

function makeLabelDrawer(ctx, width, height, mini) {
  const placed = [];
  return (name, x, y, emphasis, color, halo) => {
    if (x < 4 || x > width - 4 || y < 4 || y > height - 4) return false;
    const fontSize = mini ? 8 : emphasis ? 13 : 12;
    const gap = mini ? 4 : 7;
    ctx.font = `${emphasis ? 700 : 600} ${fontSize}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    const labelWidth = ctx.measureText(name).width;

    for (const [labelX, labelY] of [
      [x + gap, y - gap], [x - gap - labelWidth, y - gap],
      [x + gap, y + gap], [x - gap - labelWidth, y + gap],
    ]) {
      const box = { left: labelX - 3, top: labelY - fontSize / 2 - 2, right: labelX + labelWidth + 3, bottom: labelY + fontSize / 2 + 2 };
      if (box.left < 1 || box.right > width - 1 || box.top < 1 || box.bottom > height - 1) continue;
      if (box.right > width - (mini ? 31 : 148) && box.bottom > height - (mini ? 31 : 52)) continue;
      if (placed.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) continue;
      placed.push(box);

      ctx.strokeStyle = halo;
      ctx.lineWidth = mini ? 2 : 3.5;
      ctx.lineJoin = "round";
      ctx.strokeText(name, labelX, labelY);
      ctx.fillStyle = color;
      ctx.fillText(name, labelX, labelY);
      return true;
    }
    return false;
  };
}

function drawCities(ctx, cities, project, drawLabel, visitedNames, zoom, mini, color, halo) {
  const rankLimit = zoom < 1.6 ? 0 : zoom < 3 ? 2 : 8;
  for (const [name, lon, lat, rank] of cities) {
    if (mini ? !previewCities.has(name) : rank > rankLimit) continue;
    if (visitedNames.has(name)) continue;
    const [x, y] = project(lon, lat);
    if (!drawLabel(name, x, y, false, color, halo)) continue;
    ctx.beginPath();
    ctx.arc(x, y, mini ? 1.25 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMap(canvas, data, view, locations, mini) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  const styles = getComputedStyle(canvas);
  const color = name => styles.getPropertyValue(`--map-${name}`).trim();
  const scale = scaleFor(width, height, view.zoom, mini);
  const project = (lon, lat) => [
    width / 2 + (lon - view.lon) * scale,
    height / 2 - (lat - view.lat) * scale,
  ];
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = color("water");
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(...project(0, 0));
  ctx.scale(scale, scale);
  ctx.strokeStyle = color("grid");
  ctx.lineWidth = (mini ? 0.45 : 0.7) / scale;
  ctx.stroke(grid);
  ctx.fillStyle = color("land");
  ctx.fill(data.land, "evenodd");
  ctx.strokeStyle = color("coast");
  ctx.lineWidth = (mini ? 0.4 : 0.75) / scale;
  ctx.stroke(data.land);
  ctx.strokeStyle = color("border");
  ctx.stroke(data.borders);
  ctx.restore();

  const drawLabel = makeLabelDrawer(ctx, width, height, mini);
  const visitedNames = new Set();
  for (const { name, lon, lat } of locations) {
    if (!name) continue;
    const [x, y] = project(lon, lat);
    if (drawLabel(name, x, y, true, color("visit-label"), color("label-halo"))) visitedNames.add(name);
  }
  drawCities(ctx, data.cities, project, drawLabel, visitedNames, view.zoom, mini, color("city"), color("label-halo"));

  for (const { lon, lat } of locations) {
    const [x, y] = project(lon, lat);
    if (x < -8 || x > width + 8 || y < -8 || y > height + 8) continue;
    ctx.fillStyle = color("visit-halo");
    ctx.beginPath();
    ctx.arc(x, y, mini ? 3.8 : 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color("visit");
    ctx.beginPath();
    ctx.arc(x, y, mini ? 2.8 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function addMapControls(canvas, dialog, view, redraw) {
  const zoomIn = dialog.querySelector('[data-map-zoom="in"]');
  const zoomOut = dialog.querySelector('[data-map-zoom="out"]');
  const reset = dialog.querySelector('[data-map-zoom="reset"]');
  const pointers = new Map();

  function update(lon, lat, zoom) {
    view.lon = zoom === 1 ? worldView.lon : clamp(lon, -180, 180);
    view.lat = zoom === 1 ? worldView.lat : clamp(lat, -66, 84);
    view.zoom = zoom;
    zoomIn.disabled = zoom >= maxZoom;
    zoomOut.disabled = zoom <= 1;
    redraw();
  }

  function move(dx, dy, factor = 1, x = canvas.clientWidth / 2, y = canvas.clientHeight / 2) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const zoom = clamp(view.zoom * factor, 1, maxZoom);
    const previousScale = scaleFor(width, height, view.zoom, false);
    const scale = scaleFor(width, height, zoom, false);
    const change = 1 / previousScale - 1 / scale;
    update(
      view.lon + (x - width / 2) * change - dx / scale,
      view.lat - (y - height / 2) * change + dy / scale,
      zoom,
    );
  }

  zoomIn.addEventListener("click", () => move(0, 0, 1.65));
  zoomOut.addEventListener("click", () => move(0, 0, 1 / 1.65));
  reset.addEventListener("click", () => update(worldView.lon, worldView.lat, 1));
  zoomOut.disabled = true;

  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    move(0, 0, event.deltaY < 0 ? 1.2 : 1 / 1.2, event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });

  canvas.addEventListener("keydown", event => {
    const controls = {
      "+": [0, 0, 1.65], "=": [0, 0, 1.65], "-": [0, 0, 1 / 1.65],
      ArrowLeft: [45, 0], ArrowRight: [-45, 0], ArrowUp: [0, 45], ArrowDown: [0, -45],
    };
    const action = controls[event.key];
    if (!Array.isArray(action)) return;
    event.preventDefault();
    move(...action);
  });

  const point = event => ({ x: event.clientX, y: event.clientY });
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0 || pointers.size >= 2) return;
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, point(event));
  });
  canvas.addEventListener("pointermove", event => {
    const before = pointers.get(event.pointerId);
    if (!before) return;
    const after = point(event);
    pointers.set(event.pointerId, after);
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    if (pointers.size === 1) {
      move(dx, dy);
      return;
    }
    const other = [...pointers].find(([id]) => id !== event.pointerId)[1];
    const previousDistance = Math.hypot(before.x - other.x, before.y - other.y);
    const distance = Math.hypot(after.x - other.x, after.y - other.y);
    if (!previousDistance || !distance) return;
    const rect = canvas.getBoundingClientRect();
    move(dx / 2, dy / 2, distance / previousDistance,
      (before.x + other.x) / 2 - rect.left, (before.y + other.y) / 2 - rect.top);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(event, ({ pointerId }) => pointers.delete(pointerId));
  }
  return ({ lon, lat }) => update(lon, lat, Math.max(view.zoom, 4));
}

function showVisitorPlaces(dialog, places, focusPlace) {
  const section = dialog.querySelector(".visitor-map-places");
  const list = section.querySelector("ul");
  for (const place of places) {
    if (!place.name) continue;
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "visitor-map-place";
    button.textContent = place.region ? `${place.name} (region)` : place.name;
    button.addEventListener("click", () => focusPlace(place));
    item.append(button);
    list.append(item);
  }
  section.hidden = list.childElementCount === 0;
}

export async function setupVisitorMap(stats, visitorLocations) {
  const preview = stats.querySelector(".visitor-map-preview");
  const mini = preview.querySelector("canvas");
  const dialog = stats.querySelector(".visitor-map-dialog");
  const canvas = dialog.querySelector("canvas");
  if (!mini.getContext("2d") || !canvas.getContext("2d") || !dialog.showModal) return;

  const response = await fetch("/assets/visitor-map/world.json");
  if (!response.ok) throw new Error("World map data unavailable");
  const world = await response.json();
  const data = { land: new Path2D(world.land), borders: new Path2D(world.borders), cities: world.cities };
  const view = { ...worldView };
  const legend = stats.querySelector("[data-visitor-legend]");
  let locations = [];
  let frame;

  function redraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      drawMap(mini, data, worldView, locations, true);
      if (dialog.open) drawMap(canvas, data, view, locations, false);
    });
  }

  const focusPlace = addMapControls(canvas, dialog, view, redraw);
  legend.dataset.empty = "";
  legend.textContent = "Visit locations loading…";
  visitorLocations.then(async points => {
    if (points?.length) {
      locations = points.map(([lon, lat]) => ({ lon, lat }));
      delete legend.dataset.empty;
      legend.textContent = "Visitor location (IP estimate)";
      redraw();
      locations = await identifyVisitorPlaces(points);
      showVisitorPlaces(dialog, locations, focusPlace);
    } else {
      legend.textContent = points ? "No recent visit locations" : "Visit locations unavailable";
    }
    redraw();
  });

  mini.hidden = false;
  preview.querySelector(".visitor-map-fallback").hidden = true;
  preview.setAttribute("aria-haspopup", "dialog");
  preview.addEventListener("click", event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.showModal();
    redraw();
  });

  const resizeObserver = new ResizeObserver(redraw);
  resizeObserver.observe(mini);
  resizeObserver.observe(canvas);
  new MutationObserver(redraw).observe(document.documentElement, { attributeFilter: ["data-theme"] });
  redraw();
}
