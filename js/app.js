(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var sheet = null, files = [], repeat = true, token = 0, timer = null, pos = {}, edW = 595.32;
  var FIELDS = [ // default spots (points from top-left of an A4 sheet), measured on the Bhavans sheet
    { k: "cls", x: 100, y: 79 }, { k: "sem", x: 283, y: 79 }, { k: "date", x: 475, y: 79 },
    { k: "course", x: 144, y: 100 }, { k: "cid", x: 481, y: 100 }, { k: "prac", x: 176, y: 120 }, { k: "page", x: 500, y: 120 } ];
  pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

  /* helpers */
  function say(t, err) { $("msg").textContent = t; $("msg").className = "msg" + (err ? " err" : ""); }
  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function plural(n) { return n + (n === 1 ? " page" : " pages"); }
  async function readPdf(file) {
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) throw new Error(file.name + " is not a PDF.");
    var bytes = new Uint8Array(await file.arrayBuffer());
    var doc;
    try { doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true }); }
    catch (e) { throw new Error("Could not read " + file.name + ". It may be damaged or password-protected."); }
    return { name: file.name, size: file.size, bytes: bytes, pages: doc.getPageCount() };
  }
  function wireDrop(zone, input, handler) {
    zone.onclick = function () { input.click(); };
    zone.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    input.onchange = function () { handler(input.files); input.value = ""; };
    ["dragenter", "dragover"].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove("over"); }); });
    zone.addEventListener("drop", function (e) { handler(e.dataTransfer.files); });
  }
  function card(f, note, warn, onRemove, label) {
    var pdf = document.createElement("span"); pdf.className = "pdf"; pdf.textContent = "PDF";
    var fi = document.createElement("div"); fi.className = "fi";
    var n = document.createElement("span"); n.textContent = f.name;
    var s = document.createElement("small"); s.textContent = note; if (warn) s.className = "warn";
    fi.appendChild(n); fi.appendChild(s);
    var x = document.createElement("button"); x.className = "x"; x.type = "button"; x.textContent = "\u00d7";
    x.setAttribute("aria-label", "Remove " + label); x.onclick = onRemove;
    return [pdf, fi, x];
  }

  /* 1 journal sheet */
  async function addSheet(list) {
    say(""); if (!list.length) return;
    try { sheet = await readPdf(list[0]); } catch (e) { say(e.message, true); }
    showSheet(); refresh();
  }
  function showSheet() {
    var box = $("fileS"); box.innerHTML = "";
    if (sheet) {
      var warn = sheet.pages > 1;
      card(sheet, warn ? "Using page 1 of " + sheet.pages : "1 page \u00b7 " + size(sheet.size), warn,
        function () { sheet = null; showSheet(); refresh(); }, "journal sheet")
        .forEach(function (e) { box.appendChild(e); });
    }
    box.hidden = !sheet; $("dropS").hidden = !!sheet; $("place").disabled = !sheet;
    pos = {};
    if (sheet) { try { pos = JSON.parse(localStorage.getItem(posKey()) || "{}"); } catch (e) {} }
  }
  wireDrop($("dropS"), $("pickS"), addSheet);

  /* 2 practical */
  async function addFiles(list) {
    say("");
    for (var i = 0; i < list.length; i++) {
      try { files.push(await readPdf(list[i])); } catch (e) { say(e.message, true); }
    }
    showFiles(); refresh();
  }
  function showFiles() {
    var ul = $("files"); ul.innerHTML = "";
    files.forEach(function (f, i) {
      var li = document.createElement("li");
      card(f, plural(f.pages) + " \u00b7 " + size(f.size), false, function () { files.splice(i, 1); showFiles(); refresh(); }, f.name)
        .forEach(function (e) { li.appendChild(e); });
      ul.appendChild(li);
    });
  }
  wireDrop($("dropP"), $("pickP"), addFiles);

  /* 3 settings */
  function setPlace(every) {
    repeat = every;
    $("pEvery").setAttribute("aria-pressed", every); $("pOnce").setAttribute("aria-pressed", !every);
    refresh();
  }
  $("pEvery").onclick = function () { setPlace(true); };
  $("pOnce").onclick = function () { setPlace(false); };
  ["cls", "sem", "course", "cid", "date", "prac", "start"].forEach(function (id) {
    $(id).addEventListener("input", refresh); $(id).addEventListener("change", refresh);
  });
  $("stamp").addEventListener("change", refresh);
  $("theory").addEventListener("change", refresh);

  /* details -> values printed on the sheet */
  function dmy(v) { var p = v.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function values() {
    var o = {}, v;
    ["cls", "sem"].forEach(function (k) { if ($(k).value) o[k] = $(k).value; });
    ["course", "cid", "prac"].forEach(function (k) { v = $(k).value.trim(); if (v) o[k] = v; });
    if ($("date").value) o.date = dmy($("date").value);
    var s = parseInt($("start").value, 10); if (!isNaN(s)) o.page = String(s);
    return o;
  }
  function posKey() { return "jm-pos:" + sheet.name + ":" + sheet.size; }
  function spot(f) { return pos[f.k] || [f.x / 595.32, f.y / 841.92]; }
  function fieldList() {
    var v = values();
    return FIELDS.filter(function (f) { return v[f.k]; }).map(function (f) { var p = spot(f); return { k: f.k, text: v[f.k], fx: p[0], fy: p[1] }; });
  }

  function opts() {
    var s = parseInt($("start").value, 10);
    return { L: PDFLib, sheetBytes: sheet ? sheet.bytes : null, files: files.map(function (f) { return f.bytes; }),
             repeat: repeat, stamp: $("stamp").checked, theory: $("theory").checked, start: isNaN(s) ? 0 : s,
             fields: sheet ? fieldList() : [] };
  }
  function refresh() {
    $("go").disabled = !(sheet && files.length);
    clearTimeout(timer); timer = setTimeout(preview, 250);
  }

  /* preview */
  var MAXP = 16;
  function setCount(t, busy) { $("count").textContent = t; $("count").className = "count" + (busy ? " busy" : ""); }
  function layoutPages(o) {
    var pg = $("pages"), pairs = o && o.sheetBytes && o.repeat;
    pg.className = "pages";
    pg.style.setProperty("--cols", pairs ? 2 : 1);
    pg.style.setProperty("--base", pairs ? "280px" : "480px");
  }
  function showEmpty() { $("pages").innerHTML = ""; $("more").hidden = true; $("empty").hidden = false; setCount(""); }
  async function preview() {
    if (!sheet && !files.length) { showEmpty(); return; }
    var tk = ++token, o = opts(), pg = $("pages");
    setCount("Updating\u2026", true); $("empty").hidden = true;
    if (!pg.children.length) { layoutPages(o); pg.innerHTML = '<div class="skel"></div><div class="skel"></div>'; }
    else pg.classList.add("stale");
    try {
      var bytes = await JournalMerge.build(o);
      if (tk !== token) return;
      var pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      var total = pdf.numPages, show = Math.min(total, MAXP), frag = document.createDocumentFragment();
      for (var i = 1; i <= show; i++) {
        var page = await pdf.getPage(i);
        if (tk !== token) return;
        var vp = page.getViewport({ scale: 760 / page.getViewport({ scale: 1 }).width });
        var cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
        await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
        if (tk !== token) return;
        var d = document.createElement("div"); d.className = "pg"; d.appendChild(cv);
        frag.appendChild(d);
      }
      pg.innerHTML = ""; layoutPages(o); pg.appendChild(frag);
      $("more").hidden = total <= show; $("more").textContent = "+ " + (total - show) + " more pages in the final file";
      setCount(plural(total));
    } catch (e) {
      if (tk !== token) return;
      pg.classList.remove("stale"); setCount(""); say("Preview failed: " + (e && e.message ? e.message : e), true);
    }
  }
  /* saved subjects (this browser only) */
  function loadSubs() { try { return JSON.parse(localStorage.getItem("jm-subjects") || "[]"); } catch (e) { return []; } }
  function storeSubs(a) { try { localStorage.setItem("jm-subjects", JSON.stringify(a)); } catch (e) {} }
  function chips() {
    var c = $("chips"); c.innerHTML = "";
    loadSubs().forEach(function (s, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = s.label;
      b.title = "Click to fill. Double-click to remove.";
      b.onclick = function () { $("cls").value = s.cls; $("sem").value = s.sem; $("course").value = s.course; $("cid").value = s.cid; refresh(); };
      b.ondblclick = function () { var a = loadSubs(); a.splice(i, 1); storeSubs(a); chips(); };
      c.appendChild(b);
    });
  }
  $("save").onclick = function () {
    var c = $("course").value.trim();
    if (!c) { say("Enter a course name first.", true); return; }
    var a = loadSubs().filter(function (s) { return s.course !== c; });
    a.push({ label: c.length > 14 ? c.slice(0, 13) + "\u2026" : c, cls: $("cls").value, sem: $("sem").value, course: c, cid: $("cid").value.trim() });
    storeSubs(a); chips(); say("Subject saved on this device.");
  };

  /* position editor: drag each detail onto its blank */
  function sizeChips() {
    var w = $("edw"), s = $("edc").clientWidth / edW;
    w.querySelectorAll(".chipf").forEach(function (c) { c.style.fontSize = 11 * s + "px"; });
  }
  async function openEditor() {
    var vals = values();
    var pdf = await pdfjsLib.getDocument({ data: sheet.bytes.slice() }).promise, pg = await pdf.getPage(1);
    var vp1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 1000 / vp1.width }), cv = $("edc");
    edW = vp1.width; cv.width = vp.width; cv.height = vp.height;
    await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    var w = $("edw"); w.querySelectorAll(".chipf").forEach(function (e) { e.remove(); });
    FIELDS.forEach(function (f) {
      if (!vals[f.k]) return;
      var c = document.createElement("div"); c.className = "chipf"; c.textContent = vals[f.k]; c.tabIndex = 0;
      var p = spot(f); c.style.left = p[0] * 100 + "%"; c.style.top = p[1] * 100 + "%";
      var sx, sy, ox, oy;
      c.onpointerdown = function (e) { c.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY; ox = spot(f)[0]; oy = spot(f)[1]; };
      c.onpointermove = function (e) {
        if (!c.hasPointerCapture(e.pointerId)) return;
        move(f, c, ox + (e.clientX - sx) / w.clientWidth, oy + (e.clientY - sy) / cv.clientHeight);
      };
      c.onkeydown = function (e) {
        var d = { ArrowLeft: [-.002, 0], ArrowRight: [.002, 0], ArrowUp: [0, -.002], ArrowDown: [0, .002] }[e.key];
        if (d) { e.preventDefault(); var p2 = spot(f); move(f, c, p2[0] + d[0], p2[1] + d[1]); }
      };
      w.appendChild(c);
    });
    $("ed").showModal(); sizeChips();
  }
  function move(f, c, x, y) {
    x = Math.min(.98, Math.max(0, x)); y = Math.min(.98, Math.max(0, y));
    pos[f.k] = [x, y]; c.style.left = x * 100 + "%"; c.style.top = y * 100 + "%";
  }
  window.addEventListener("resize", function () { if ($("ed").open) sizeChips(); });
  $("place").onclick = function () {
    if (!Object.keys(values()).length) { say("Fill in at least one detail first.", true); return; }
    openEditor().catch(function (e) { say("Could not open the sheet: " + e.message, true); });
  };
  $("edReset").onclick = function () { pos = {}; openEditor(); };
  $("edDone").onclick = function () {
    try { localStorage.setItem(posKey(), JSON.stringify(pos)); } catch (e) {}
    $("ed").close(); refresh();
  };

  /* usage counter */
  var C = window.JM_COUNTER || {};
  function fmt(n) { return Number(n).toLocaleString("en-IN"); }
  function call(op, key) {
    return fetch(C.base + "/" + op + "/" + C.ns + "/" + key).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { return j.value; });
  }
  function stat(el, op, key) {
    if (!C.base) return;
    call(op, key).then(function (v) { $(el).textContent = fmt(v); })
      .catch(function () { if (op === "get") $(el).textContent = "0"; });
  }
  var seen = false; try { seen = sessionStorage.getItem("jm-seen") === "1"; } catch (e) {}
  stat("sVis", seen ? "get" : "hit", "visitors");
  try { sessionStorage.setItem("jm-seen", "1"); } catch (e) {}
  stat("sGen", "get", "generated");

  /* generate + download */
  $("go").onclick = async function () {
    var btn = $("go"); btn.disabled = true; say("Merging\u2026");
    try {
      var bytes = await JournalMerge.build(opts());
      var name = files[0].name.replace(/\.pdf$/i, "").replace(/[^\w\-]+/g, "_") + "_Journal.pdf";
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
      say("Done. Your journal is in your downloads.");
      stat("sGen", "hit", "generated");
    } catch (e) { say("Something went wrong while merging: " + (e && e.message ? e.message : e), true); }
    refresh();
  };

  window.JM = { addPractical: function (list) { location.hash = "#journal"; addFiles(list); } };
  chips(); showEmpty(); refresh();
})();
