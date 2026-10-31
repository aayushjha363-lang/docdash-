/* Small helpers shared by all tools. */
(function () {
  "use strict";
  var U = window.U = {};
  pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

  U.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  U.base = function (n) { return n.replace(/\.[^.]+$/, "").replace(/[^\w\-]+/g, "_") || "file"; };
  U.size = function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; };
  U.plural = function (n, w) { return n + " " + w + (n === 1 ? "" : "s"); };

  U.download = function (data, name, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/pdf" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  };

  U.loadPdf = async function (file) {
    var bytes = new Uint8Array(await file.arrayBuffer());
    var doc;
    try { doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true }); }
    catch (e) { throw new Error("Could not read " + file.name + ". It may be damaged or password-protected."); }
    return { name: file.name, size: file.size, bytes: bytes, doc: doc, n: doc.getPageCount() };
  };

  /* "1-3, 5, 8-10" -> { pages:[1,2,3,5,8,9,10], ranges:[[1,3],[5,5],[8,10]] } or { error } */
  U.parseRanges = function (text, max) {
    var ranges = [], pages = [];
    var parts = text.split(/[,\s;]+/).filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      var m = /^(\d+)(?:\s*[-\u2013]\s*(\d+))?$/.exec(parts[i]);
      if (!m) return { error: "\u201c" + parts[i] + "\u201d is not a valid page or range." };
      var a = +m[1], b = m[2] ? +m[2] : a;
      if (a < 1 || b < 1 || a > max || b > max) return { error: "Pages must be between 1 and " + max + "." };
      if (a > b) return { error: "Range " + a + "-" + b + " is backwards." };
      ranges.push([a, b]); for (var p = a; p <= b; p++) pages.push(p);
    }
    return { pages: pages, ranges: ranges };
  };

  U.wireDrop = function (zone, input, handler) {
    zone.onclick = function () { input.click(); };
    zone.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    input.onchange = function () { handler(Array.prototype.slice.call(input.files)); input.value = ""; };
    ["dragenter", "dragover"].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove("over"); }); });
    zone.addEventListener("drop", function (e) { handler(Array.prototype.slice.call(e.dataTransfer.files)); });
  };

  /* Renders small page thumbnails one by one. each(canvas, pageNumber). Stops if `host` leaves the page. */
  U.thumbs = async function (bytes, host, each, max) {
    var pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    var n = Math.min(pdf.numPages, max || 300);
    for (var i = 1; i <= n; i++) {
      if (!host.isConnected) return pdf.numPages;
      var pg = await pdf.getPage(i), vp1 = pg.getViewport({ scale: 1 });
      var vp = pg.getViewport({ scale: 240 / Math.max(vp1.width, vp1.height) * 1.0 });
      var cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      if (!host.isConnected) return pdf.numPages;
      each(cv, i);
    }
    return pdf.numPages;
  };

  U.zip = async function (items) {
    var z = new JSZip();
    items.forEach(function (it) { z.file(it.name, it.bytes); });
    return await z.generateAsync({ type: "blob" });
  };
})();
