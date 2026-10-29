/* Capture installation offers before React hydration, including on slow phones. */
(function () {
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__luoInstallPrompt = event;
  });
  window.addEventListener("appinstalled", function () {
    window.__luoInstallPrompt = null;
  });
})();
