import { setupVisitorMap } from "./visitor-map.js";

const stats = document.querySelector(".visitor-stats");
const live = location.origin === "https://fuxiangzhai.github.io";

function loadWidget(container, filename, initialize, onError) {
  // Supercounters inserts its linked visit count next to its own script tag.
  const script = document.createElement("script");
  script.src = `https://widget.supercounters.com/ssl/${filename}.js`;
  script.addEventListener("load", initialize, { once: true });
  if (onError) script.addEventListener("error", onError, { once: true });
  container.append(script);
}

function readLocations(preview, counterId) {
  return new Promise(resolve => {
    const timeout = setTimeout(resolve, 8000);
    function finish(locations) {
      clearTimeout(timeout);
      resolve(locations);
    }

    loadWidget(preview, "map", () => {
      // Use the widget's location payload on the site's own basemap.
      window.sc_show_map = (id, payload) => {
        if (id !== counterId || typeof payload !== "string") return;
        try {
          const points = JSON.parse(payload.trim().replace(/^\(|\)$/g, ""));
          const locations = points
            .filter(point => Number.isFinite(point?.lo) && Number.isFinite(point.la)
              && Math.abs(point.lo) <= 180 && Math.abs(point.la) <= 90)
            .map(point => [point.lo, point.la]);
          finish(locations);
        } catch {
          finish();
        }
      };
      window.sc_map_var = [];
      window.sc_map(counterId, "112288", "ffcc66", 60);
    }, () => finish());
  });
}

function showCount(count, counterId) {
  const countObserver = new MutationObserver(() => {
    const link = count.querySelector("a");
    if (!link) return;
    link.href = `https://www.supercounters.com/stats/${counterId}`;
    link.style.removeProperty("color");
    const rawCount = link.textContent.trim();
    const visits = Number(rawCount.replaceAll(",", ""));
    if (rawCount && Number.isSafeInteger(visits) && visits >= 0) {
      const label = visits === 1 ? "recorded visit" : "recorded visits";
      link.textContent = `${visits.toLocaleString("en")} ${label}`;
    }
    countObserver.disconnect();
  });
  countObserver.observe(count, { childList: true });

  loadWidget(count, "texthit", () => {
    window.sc_texthit_var = [];
    window.sc_text_hit(counterId, "", "3553d6");
  });
}

if (stats) {
  const counterId = Number(stats.dataset.counterId);
  const preview = stats.querySelector(".visitor-map-preview");
  const locations = live ? readLocations(preview, counterId) : Promise.resolve();
  if (live) showCount(stats.querySelector(".visitor-stats-count"), counterId);
  setupVisitorMap(stats, locations).catch(() => {
    // The preview remains a link to the provider's map if local map data cannot load.
  });
}
