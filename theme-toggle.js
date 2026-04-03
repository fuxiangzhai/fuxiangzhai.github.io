(function () {
  var STORAGE_KEY = "site-theme";

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

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Ignore storage access errors.
    }

    var toggles = document.querySelectorAll("[data-theme-toggle]");
    toggles.forEach(function (button) {
      button.setAttribute("aria-label", "Switch theme");
      button.textContent = theme === "dark" ? "Light" : "Dark";
    });
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark");
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

  function init() {
    setTheme(getPreferredTheme());
    setupScrollNav();

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
