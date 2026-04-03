(function () {
  var STORAGE_KEY = "theme-storage";

  function getStoredPreference() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return "system";

      var parsed = JSON.parse(raw);
      var value = parsed && parsed.state && parsed.state.theme;
      if (value === "dark" || value === "light" || value === "system") {
        return value;
      }
    } catch (error) {
      // Fall through to default
    }
    return "system";
  }

  function savePreference(theme) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { theme: theme },
          version: 0,
        })
      );
    } catch (error) {
      // Ignore storage errors
    }
  }

  function resolveTheme(preference) {
    if (preference === "dark" || preference === "light") {
      return preference;
    }
    var prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
  }

  function createToggleInnerHtml() {
    return (
      '<span class="sr-only">Toggle theme</span>' +
      '<svg data-theme-icon="moon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5 text-neutral-600 dark:text-neutral-400">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.598.748-3.752A9.753 9.753 0 1 0 21.752 15.002Z" />' +
      "</svg>" +
      '<svg data-theme-icon="sun" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5 text-amber-500" style="display:none">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m15.364 6.364-1.06-1.06M6.697 6.697l-1.06-1.06m12.727 0-1.06 1.06M6.697 17.303l-1.06 1.06M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />' +
      "</svg>"
    );
  }

  function setupToggleControls() {
    var pulseDots = document.querySelectorAll("nav .animate-pulse");
    pulseDots.forEach(function (dot) {
      var control = dot.parentElement;
      if (!control || control.getAttribute("data-theme-toggle") === "true") {
        return;
      }

      control.setAttribute("data-theme-toggle", "true");
      control.setAttribute("role", "button");
      control.setAttribute("tabindex", "0");
      control.classList.add(
        "cursor-pointer",
        "transition-colors",
        "duration-200",
        "hover:bg-neutral-100",
        "dark:hover:bg-neutral-700"
      );
      control.innerHTML = createToggleInnerHtml();
    });
  }

  function syncToggleIcons(theme) {
    var isDark = theme === "dark";
    var controls = document.querySelectorAll('[data-theme-toggle="true"]');

    controls.forEach(function (control) {
      var moon = control.querySelector('[data-theme-icon="moon"]');
      var sun = control.querySelector('[data-theme-icon="sun"]');

      if (moon) moon.style.display = isDark ? "none" : "block";
      if (sun) sun.style.display = isDark ? "block" : "none";

      var label = isDark ? "Switch to light mode" : "Switch to dark mode";
      control.setAttribute("aria-label", label);
      control.setAttribute("title", label);
    });
  }

  function getCurrentEffectiveTheme() {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }

  function toggleTheme() {
    var next = getCurrentEffectiveTheme() === "dark" ? "light" : "dark";
    savePreference(next);
    applyTheme(next);
    syncToggleIcons(next);
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      var control = event.target.closest('[data-theme-toggle="true"]');
      if (!control) return;
      event.preventDefault();
      toggleTheme();
    });

    document.addEventListener("keydown", function (event) {
      var control = event.target.closest('[data-theme-toggle="true"]');
      if (!control) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleTheme();
    });
  }

  function bindSystemThemeWatcher() {
    if (!window.matchMedia) return;
    var mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    var handleChange = function () {
      if (getStoredPreference() !== "system") return;
      var effective = resolveTheme("system");
      applyTheme(effective);
      syncToggleIcons(effective);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange);
    }
  }

  function setupNavScrollEffect() {
    var wrappers = document.querySelectorAll("nav.fixed > div.transition-all");
    if (!wrappers.length) return;

    var rafScheduled = false;
    var lastScrolledState = null;
    var scrolledClasses = [
      "bg-background/80",
      "backdrop-blur-xl",
      "border-b",
      "border-neutral-200/50",
      "shadow-lg",
    ];

    function setScrolledState(scrolled) {
      if (lastScrolledState === scrolled) return;
      lastScrolledState = scrolled;

      wrappers.forEach(function (wrapper) {
        if (scrolled) {
          wrapper.classList.remove("bg-transparent");
          scrolledClasses.forEach(function (className) {
            wrapper.classList.add(className);
          });
        } else {
          scrolledClasses.forEach(function (className) {
            wrapper.classList.remove(className);
          });
          wrapper.classList.add("bg-transparent");
        }
      });
    }

    function update() {
      setScrolledState((window.scrollY || 0) > 20);
    }

    function onScroll() {
      if (rafScheduled) return;
      rafScheduled = true;
      window.requestAnimationFrame(function () {
        update();
        rafScheduled = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(
      "resize",
      function () {
        update();
      },
      { passive: true }
    );

    update();
  }

  function patchEmailLink() {
    var mailto = "mailto:18366752695@163.com";
    var emailButtons = document.querySelectorAll('button[aria-label="Email"]');

    emailButtons.forEach(function (button) {
      if (button.closest('a[href^="mailto:"]')) return;

      var link = document.createElement("a");
      link.href = mailto;
      link.className = button.className;
      link.classList.add("inline-flex", "items-center", "justify-center", "leading-none");
      link.setAttribute("aria-label", "Email");
      link.setAttribute("title", "18366752695@163.com");
      link.innerHTML = button.innerHTML;
      button.replaceWith(link);
    });

    var emailLinks = document.querySelectorAll('a[aria-label="Email"]');
    emailLinks.forEach(function (link) {
      link.href = mailto;
      link.classList.add("inline-flex", "items-center", "justify-center", "leading-none");
      link.setAttribute("title", "18366752695@163.com");

      // Force mailto navigation so browser can hand off to configured mail service.
      link.addEventListener("click", function () {
        window.location.href = mailto;
      });
    });
  }

  function patchScholarPlaceholder() {
    var scholarLinks = document.querySelectorAll('a[aria-label="Google Scholar"]');

    scholarLinks.forEach(function (link) {
      var placeholder = document.createElement("span");
      placeholder.className = link.className;
      placeholder.classList.add("inline-flex", "items-center", "justify-center");
      placeholder.setAttribute("aria-label", "Google Scholar");
      placeholder.setAttribute("title", "Google Scholar (coming soon)");
      placeholder.innerHTML = '<span class="h-5 w-5"></span>';
      link.replaceWith(placeholder);
    });
  }

  function removeOrcidLink() {
    var orcidLinks = document.querySelectorAll('a[aria-label="ORCID"]');
    orcidLinks.forEach(function (link) {
      link.remove();
    });
  }

  function patchCvLink() {
    var cvLinks = document.querySelectorAll('a[aria-label="cv"]');
    cvLinks.forEach(function (link) {
      link.href = "/file/CV.pdf";
      link.setAttribute("title", "Curriculum Vitae");
    });
  }

  function patchPosterRewardNewsLink() {
    var targetText = 'Our paper "PosterReward" (arXiv:2603.29855) was accepted by CVPR 2026.';
    var paragraphs = document.querySelectorAll("p");

    paragraphs.forEach(function (p) {
      if (p.textContent.trim() !== targetText) return;

      p.innerHTML =
        'Our paper <a href="https://alexlai2860.github.io/PosterReward/" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">"PosterReward"</a> was accepted by CVPR 2026.';
    });
  }

  function init() {
    setupToggleControls();
    setupNavScrollEffect();

    var effective = resolveTheme(getStoredPreference());
    applyTheme(effective);
    syncToggleIcons(effective);

    patchEmailLink();
    patchScholarPlaceholder();
    removeOrcidLink();
    patchCvLink();
    patchPosterRewardNewsLink();

    bindEvents();
    bindSystemThemeWatcher();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
