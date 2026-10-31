(function () {
  "use strict";
  var intro = document.getElementById("intro");
  if (!intro) return;

  function dismiss() {
    intro.classList.add("leaving");
    setTimeout(function () { intro.remove(); }, 450);
  }

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    intro.remove();
  } else {
    setTimeout(dismiss, 1500);
  }
})();
