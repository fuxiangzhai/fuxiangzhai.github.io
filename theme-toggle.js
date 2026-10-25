(function () {
  var STORAGE_KEY = "site-theme";
  var root = document.documentElement;
  var ICONS = {
    // Shown in light mode: switch to dark.
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    // Shown in dark mode: switch to light.
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
  };

  function getPreferredTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (error) {
      // Ignore storage access errors.
    }

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function renderToggles(theme) {
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    toggles.forEach(function (button) {
      var label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
    });
  }

  function setTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (error) {
        // Ignore storage access errors.
      }
    }
    renderToggles(theme);
  }

  function toggleTheme() {
    var current = root.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark", true);
  }

  function setupScrollNav() {
    var nav = document.querySelector(".site-nav");
    if (!nav) return;

    function updateNav() {
      if (window.scrollY > 20) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    }

    window.addEventListener("scroll", updateNav, { passive: true });
    updateNav();
  }

  function setupReveal() {
    var targets = document.querySelectorAll(".section-block, .page-header, .paper-card, .interest-card");
    if (!("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });

    targets.forEach(function (el) {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  // Apply the theme immediately (this script loads in <head>) to avoid a light flash in dark mode.
  root.setAttribute("data-theme", getPreferredTheme());
  if ("IntersectionObserver" in window) root.classList.add("js");

  function init() {
    setTheme(getPreferredTheme(), false);
    setupScrollNav();
    setupReveal();

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-theme-toggle]");
      if (!trigger) return;
      event.preventDefault();
      toggleTheme();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
