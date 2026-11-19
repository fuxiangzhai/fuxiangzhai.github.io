(() => {
  const stats = document.querySelector(".visitor-stats");
  if (!stats || location.origin !== "https://fuxiangzhai.github.io") return;

  const counterId = Number(stats.dataset.counterId);
  const map = stats.querySelector(".visitor-stats-map");
  const count = stats.querySelector(".visitor-stats-count");

  function loadWidget(container, filename, initialize) {
    // The provider inserts each widget next to its own script tag.
    const script = document.createElement("script");
    script.src = `https://widget.supercounters.com/ssl/${filename}.js`;
    script.addEventListener("load", initialize, { once: true });
    container.append(script);
  }

  const countObserver = new MutationObserver(() => {
    const link = count.querySelector("a");
    if (!link) return;
    link.href = map.href;
    link.style.removeProperty("color");
    const visits = Number(link.textContent.trim().replaceAll(",", ""));
    if (Number.isSafeInteger(visits) && visits >= 0) {
      const label = visits === 1 ? "recorded visit" : "recorded visits";
      link.textContent = `${visits.toLocaleString("en")} ${label}`;
    }
    countObserver.disconnect();
  });
  countObserver.observe(count, { childList: true });

  loadWidget(map, "map", () => {
    window.sc_map_var = [];
    window.sc_map(counterId, "112288", "ffcc66", 60);
  });
  loadWidget(count, "texthit", () => {
    window.sc_texthit_var = [];
    window.sc_text_hit(counterId, "", "3553d6");
  });
})();
