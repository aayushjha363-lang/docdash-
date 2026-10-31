/* Tools: navigation, router and the PDF / image / Word tools. */
(function () {
  "use strict";
  var $ = function (i) {
    var root = document.getElementById("toolRoot");
    return (root && root.querySelector("#" + i)) || document.getElementById(i);
  };
  var esc = U.esc, plural = U.plural;

  var I = {
    remove: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
    merge: '<path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/>',
    split: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    images: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/>',
    word: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 12l1.2 5 1.8-4.5 1.8 4.5 1.2-5"/>',
    extract: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    reorder: '<path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"/>',
    pdf2img: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/>',
    compress: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    numbers: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    watermark: '<path d="M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.7 12 3.5 12 3.5z"/>',
    up: '<path d="M12 16V4m0 0 4 4m-4-4L8 8"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'
  };
  function svg(k, s) { return '<svg width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + "</svg>"; }

  var TOOLS = [
    { id: "remove", group: "Organize", name: "Remove pages", desc: "Delete pages you don\u2019t need.", lead: "Pick the pages to delete, then download the cleaned PDF.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", run: remove },
    { id: "rotate", group: "Organize", name: "Rotate pages", desc: "Fix sideways or upside-down pages.", lead: "Turn single pages or the whole document.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", run: rotate },
    { id: "merge", group: "Organize", name: "Merge PDFs", desc: "Combine several PDFs into one.", lead: "Add your files, put them in order and merge.", accept: "application/pdf", multiple: true, dropTitle: "Upload PDFs", dropHint: "Two or more PDF files", run: merge },
    { id: "split", group: "Organize", name: "Split PDF", desc: "Cut one PDF into several.", lead: "Split by page ranges, every N pages, or one page per file.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", run: split },
    { id: "images", group: "Convert", name: "Images to PDF", desc: "Turn photos or scans into a PDF.", lead: "Photos of handwritten pages become clean A4 PDF pages.", accept: "image/*", multiple: true, dropTitle: "Upload images", dropHint: "JPG, PNG or WebP, any number", run: images },
    { id: "word", group: "Convert", name: "Word to PDF", desc: "Convert a .docx document.", lead: "Upload a Word document and get a PDF.", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", dropTitle: "Upload a Word file", dropHint: ".docx files",
      note: "Pages are saved as pictures of your document, so text in the PDF can\u2019t be selected. For a searchable PDF, use Save as PDF inside Word.", run: word },
    { id: "extract", group: "Organize", name: "Extract pages", desc: "Keep only the pages you pick.", lead: "Select the pages to keep and get them as a new PDF.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", run: extract },
    { id: "reorder", group: "Organize", name: "Reorder pages", desc: "Change the order of pages.", lead: "Move pages with the arrows, then save.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", run: reorder },
    { id: "pdf2img", group: "Convert", name: "PDF to images", desc: "Save pages as JPG or PNG.", lead: "Turn PDF pages into images you can share.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", run: pdf2img },
    { id: "compress", group: "Edit & optimize", name: "Compress PDF", desc: "Make a large PDF smaller.", lead: "Shrink scanned or photo-heavy PDFs so they upload easily.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", 
      note: "Pages are saved as images to reduce size, so text in the result can\u2019t be selected. Works best on scans and photos.", run: compress },
    { id: "numbers", group: "Edit & optimize", name: "Page numbers", desc: "Number every page.", lead: "Choose where the numbers go and how they look.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", run: numbers },
    { id: "watermark", group: "Edit & optimize", name: "Watermark", desc: "Stamp text on every page.", lead: "Add text like DRAFT or your name across all pages.", accept: "application/pdf", dropTitle: "Upload a PDF", dropHint: "One PDF file", run: watermark }
  ];
  function find(id) { return TOOLS.filter(function (t) { return t.id === id; })[0]; }

  /* ---------- navigation ---------- */
  var groups = ["Organize", "Convert", "Edit & optimize"];
  $("ddMenu").innerHTML = '<a class="mi all" href="#tools">All tools</a>' + groups.map(function (g) {
    return '<p class="mg">' + g + "</p>" + TOOLS.filter(function (t) { return t.group === g; }).map(function (t) {
      return '<a class="mi" href="#tool/' + t.id + '"><span class="mic">' + svg(t.id, 18) + "</span><span><b>" + t.name + "</b><small>" + t.desc + "</small></span></a>";
    }).join("");
  }).join("");
  $("cards").innerHTML = groups.map(function (g) {
    return '<h2 class="gh">' + g + '</h2><div class="cards">' + TOOLS.filter(function (t) { return t.group === g; }).map(function (t) {
      return '<a class="tc" href="#tool/' + t.id + '"><span class="tic">' + svg(t.id) + "</span><b>" + t.name + "</b><small>" + t.desc + "</small></a>";
    }).join("") + "</div>";
  }).join("");

  function menu(open) { $("ddMenu").hidden = !open; $("ddBtn").setAttribute("aria-expanded", open); }
  $("ddBtn").onclick = function (e) { e.stopPropagation(); menu($("ddMenu").hidden); };
  document.addEventListener("click", function (e) { if (!e.target.closest(".dd")) menu(false); else if (e.target.closest(".mi")) menu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") menu(false); });

  var lastView = "";
  function route() {
    var p = (location.hash || "#journal").replace(/^#/, "").split("/"), view = "journal", tool = null;
    if (p[0] === "tools") view = "tools";
    else if (p[0] === "tool" && find(p[1])) { view = "tool"; tool = find(p[1]); }
    ["journal", "tools", "tool"].forEach(function (v) { $("v-" + v).hidden = v !== view; });
    $("navJournal").className = view === "journal" ? "on" : "";
    $("ddBtn").className = view !== "journal" ? "on" : "";
    document.title = view === "tool" ? tool.name + " \u2013 DocDash" : view === "tools" ? "Tools \u2013 DocDash" : "DocDash \u2013 Journal & PDF Tools";
    if (view === "tool") openTool(tool);
    if (view !== lastView) window.scrollTo(0, 0);
    lastView = view;
  }
  window.addEventListener("hashchange", route);

  /* ---------- tool shell ---------- */
  function openTool(t) {
    var root = $("toolRoot");
    root.innerHTML = '<a class="back" href="#tools">\u2190 All tools</a><h1>' + t.name + '</h1><p class="lead">' + t.lead + '</p>' +
      '<div class="tcard"><div class="drop" id="td" tabindex="0" role="button" aria-label="' + t.dropTitle + '"><span class="ico">' + svg("up") + "</span><strong>" + t.dropTitle + "</strong><small>" + t.dropHint + "</small></div>" +
      '<input type="file" id="ti" hidden accept="' + t.accept + '"' + (t.multiple ? " multiple" : "") + '><div id="tw" hidden></div><p class="tmsg" id="tm" role="status"></p></div>' +
      (t.note ? '<p class="tnote">' + t.note + "</p>" : "");
    var ctx = {
      work: $("tw"), drop: $("td"), accept: t.accept,
      say: function (m, err) { $("tm").textContent = m; $("tm").className = "tmsg" + (err ? " err" : ""); },
      show: function () { $("td").hidden = true; $("tw").hidden = false; },
      reset: function () { openTool(t); },
      bindReset: function () { var b = ctx.work.querySelector('[data-act="reset"]'); if (b) b.onclick = ctx.reset; }
    };
    U.wireDrop($("td"), $("ti"), function (files) {
      if (!files.length) return; ctx.say("");
      t.run(t.multiple ? files : files.slice(0, 1), ctx).catch(function (e) { ctx.say(e && e.message ? e.message : String(e), true); });
    });
  }
  function fbar(name, meta, badge) {
    return '<div class="fbar"><span class="pdf">' + (badge || "PDF") + '</span><div class="fi"><span>' + esc(name) + "</span><small>" + meta + '</small></div><button type="button" class="btn ghost" data-act="reset">Choose another</button></div>';
  }
  function compact(set) {
    var a = Array.from(set).sort(function (x, y) { return x - y; }), out = [], i = 0;
    while (i < a.length) { var j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; out.push(j > i ? a[i] + "-" + a[j] : String(a[i])); i = j + 1; }
    return out.join(", ");
  }
  function busy(text) {
    var d = document.createElement("div"); d.className = "busy"; d.innerHTML = '<div><span class="spin"></span><p>' + text + "</p></div>";
    document.body.appendChild(d);
    return { set: function (t) { d.querySelector("p").textContent = t; }, done: function () { d.remove(); } };
  }
  function onAction(id, ctx, action) {
    var button = $(id);
    button.onclick = async function () {
      if (button.disabled) return;
      button.disabled = true;
      try { await action(); }
      catch (e) { ctx.say(e && e.message ? e.message : String(e), true); }
      finally { if (button.isConnected) button.disabled = false; }
    };
  }
  function thumbCell(cv, i, tag) {
    var d = document.createElement(tag || "button"); if (tag !== "div") d.type = "button";
    d.className = "th"; var w = document.createElement("div"); w.className = "rw"; cv.style.width = (cv.width > cv.height ? 100 : cv.width / cv.height * 100) + "%";
    w.appendChild(cv); d.appendChild(w);
    var n = document.createElement("span"); n.className = "n"; n.textContent = i; d.appendChild(n);
    return d;
  }
  async function copyInto(out, srcDoc, idx) { (await out.copyPages(srcDoc, idx)).forEach(function (p) { out.addPage(p); }); }

  /* ---------- Remove pages ---------- */
  async function remove(files, ctx) {
    var f = await U.loadPdf(files[0]); ctx.show();
    var off = new Set(), cells = {};
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<label class="fl" for="rng">Pages to remove</label><input id="rng" placeholder="e.g. 2, 5-7" autocomplete="off">' +
      '<p class="hint">Or click pages below to mark them.' + (f.n > 300 ? " The preview shows the first 300 pages. Use the box above for the rest." : "") + '</p><div class="tgrid" id="grid"></div>' +
      '<div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go" disabled>Remove pages and download</button></div>';
    ctx.bindReset();
    function paint(i) { if (cells[i]) cells[i].classList.toggle("off", off.has(i)); }
    function sync(fromInput) {
      for (var i in cells) paint(+i);
      if (!fromInput) $("rng").value = compact(off);
      var k = off.size; $("go").disabled = k === 0 || k >= f.n;
      $("note").className = "note"; $("note").textContent = k ? (k >= f.n ? "You can\u2019t remove every page." : plural(k, "page") + " removed, " + plural(f.n - k, "page") + " left") : "";
    }
    $("rng").addEventListener("input", function () {
      var r = U.parseRanges($("rng").value, f.n);
      if (r.error) { $("note").className = "note err"; $("note").textContent = r.error; $("go").disabled = true; return; }
      off = new Set(r.pages); sync(true);
    });
    U.thumbs(f.bytes, $("grid"), function (cv, i) {
      var c = thumbCell(cv, i); c.insertAdjacentHTML("beforeend", '<span class="x" aria-hidden="true">\u00d7</span>');
      c.setAttribute("aria-label", "Page " + i); c.onclick = function () { off.has(i) ? off.delete(i) : off.add(i); paint(i); sync(); };
      cells[i] = c; paint(i); $("grid").appendChild(c);
    });
    onAction("go", ctx, async function () {
      var out = await PDFLib.PDFDocument.create(), keep = [];
      for (var i = 0; i < f.n; i++) if (!off.has(i + 1)) keep.push(i);
      await copyInto(out, f.doc, keep);
      U.download(await out.save(), U.base(f.name) + "_edited.pdf"); ctx.say("Done. " + plural(keep.length, "page") + " saved.");
    });
  }

  /* ---------- Rotate pages ---------- */
  async function rotate(files, ctx) {
    var f = await U.loadPdf(files[0]); ctx.show();
    var rot = [], cvs = {};
    for (var q = 1; q <= f.n; q++) rot[q] = 0;
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<div class="bar top"><span class="note">Rotate all pages</span><span class="grp"><button type="button" class="btn ghost" id="ral">\u27f2 Left</button><button type="button" class="btn ghost" id="rar">Right \u27f3</button><button type="button" class="btn ghost" id="rrs">Reset</button></span></div>' +
      '<div class="tgrid" id="grid"></div><div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go" disabled>Save and download</button></div>';
    ctx.bindReset();
    function paint(i) { if (cvs[i]) cvs[i].style.transform = "rotate(" + rot[i] + "deg)"; }
    function sync() {
      var k = 0; for (var i = 1; i <= f.n; i++) { if (rot[i] % 360) k++; paint(i); }
      $("go").disabled = !k; $("note").textContent = k ? plural(k, "page") + " rotated" : "";
    }
    function turn(i, d) { rot[i] = ((rot[i] + d) % 360 + 360) % 360; sync(); }
    $("ral").onclick = function () { for (var i = 1; i <= f.n; i++) rot[i] = (rot[i] + 270) % 360; sync(); };
    $("rar").onclick = function () { for (var i = 1; i <= f.n; i++) rot[i] = (rot[i] + 90) % 360; sync(); };
    $("rrs").onclick = function () { for (var i = 1; i <= f.n; i++) rot[i] = 0; sync(); };
    U.thumbs(f.bytes, $("grid"), function (cv, i) {
      var c = thumbCell(cv, i, "div"); cvs[i] = cv;
      c.insertAdjacentHTML("beforeend", '<span class="rb"><button type="button" aria-label="Rotate page ' + i + ' left">\u27f2</button><button type="button" aria-label="Rotate page ' + i + ' right">\u27f3</button></span>');
      var b = c.querySelectorAll(".rb button"); b[0].onclick = function () { turn(i, -90); }; b[1].onclick = function () { turn(i, 90); };
      paint(i); $("grid").appendChild(c);
    });
    onAction("go", ctx, async function () {
      var d = await PDFLib.PDFDocument.load(f.bytes, { ignoreEncryption: true });
      d.getPages().forEach(function (p, i) { p.setRotation(PDFLib.degrees((p.getRotation().angle + rot[i + 1]) % 360)); });
      U.download(await d.save(), U.base(f.name) + "_rotated.pdf"); ctx.say("Done. Your rotated PDF is downloading.");
    });
  }

  /* ---------- Merge PDFs ---------- */
  async function merge(files, ctx) {
    var list = [];
    async function add(fs) {
      for (var i = 0; i < fs.length; i++) { try { list.push(await U.loadPdf(fs[i])); } catch (e) { ctx.say(e.message, true); } }
      draw();
    }
    ctx.show();
    ctx.work.innerHTML = '<ul class="mlist" id="ml"></ul><input type="file" id="more" hidden accept="application/pdf" multiple>' +
      '<div class="bar"><button type="button" class="btn ghost" id="add">+ Add more PDFs</button><span class="grp"><span class="note" id="note"></span><button type="button" class="btn" id="go" disabled>Merge and download</button></span></div>';
    $("add").onclick = function () { $("more").click(); };
    $("more").onchange = function () { add(Array.prototype.slice.call($("more").files)); $("more").value = ""; };
    function draw() {
      var ul = $("ml"); ul.innerHTML = "";
      list.forEach(function (f, i) {
        var li = document.createElement("li");
        li.innerHTML = '<span class="idx">' + (i + 1) + '</span><span class="pdf">PDF</span><div class="fi"><span>' + esc(f.name) + "</span><small>" + plural(f.n, "page") + " \u00b7 " + U.size(f.size) + '</small></div><span class="mb"><button type="button" aria-label="Move up">\u2191</button><button type="button" aria-label="Move down">\u2193</button><button type="button" aria-label="Remove" class="del">\u00d7</button></span>';
        var b = li.querySelectorAll(".mb button");
        b[0].onclick = function () { if (i) { list.splice(i - 1, 0, list.splice(i, 1)[0]); draw(); } };
        b[1].onclick = function () { if (i < list.length - 1) { list.splice(i + 1, 0, list.splice(i, 1)[0]); draw(); } };
        b[2].onclick = function () { list.splice(i, 1); draw(); };
        ul.appendChild(li);
      });
      var n = list.reduce(function (a, f) { return a + f.n; }, 0);
      $("note").textContent = list.length ? plural(list.length, "file") + " \u00b7 " + plural(n, "page") : "";
      $("go").disabled = list.length < 2;
    }
    onAction("go", ctx, async function () {
      var out = await PDFLib.PDFDocument.create();
      for (var i = 0; i < list.length; i++) await copyInto(out, list[i].doc, list[i].doc.getPageIndices());
      U.download(await out.save(), "merged.pdf"); ctx.say("Done. Your merged PDF is downloading.");
    });
    await add(files);
  }

  /* ---------- Split PDF ---------- */
  async function split(files, ctx) {
    var f = await U.loadPdf(files[0]); ctx.show();
    var mode = "ranges";
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<div class="seg" role="group" aria-label="Split mode"><button type="button" data-m="ranges" aria-pressed="true">By ranges</button><button type="button" data-m="every" aria-pressed="false">Every N pages</button><button type="button" data-m="each" aria-pressed="false">Each page</button></div>' +
      '<div id="opt"></div><p class="hint" id="sum"></p><div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go" disabled>Split and download</button></div>';
    ctx.bindReset();
    function opt() {
      $("opt").innerHTML = mode === "ranges" ? '<label class="fl" for="sr">Page ranges</label><input id="sr" placeholder="e.g. 1-3, 4-6, 9" autocomplete="off"><p class="hint">Each range becomes its own PDF.</p>'
        : mode === "every" ? '<label class="fl" for="sn">Pages per file</label><input id="sn" inputmode="numeric" value="2" autocomplete="off">' : "";
      var i = $("sr") || $("sn"); if (i) i.addEventListener("input", sync);
      sync();
    }
    function groups() {
      if (mode === "each") return { g: Array.from({ length: f.n }, function (_, i) { return [i + 1, i + 1]; }) };
      if (mode === "every") {
        var n = parseInt($("sn").value, 10); if (!(n >= 1)) return { error: "Enter a number of pages, 1 or more." };
        var g = []; for (var i = 1; i <= f.n; i += n) g.push([i, Math.min(i + n - 1, f.n)]); return { g: g };
      }
      var r = U.parseRanges($("sr").value, f.n); if (r.error) return r.error === undefined ? {} : { error: r.error };
      return { g: r.ranges };
    }
    function label(r) { return r[0] === r[1] ? "page " + r[0] : "pages " + r[0] + "-" + r[1]; }
    function sync() {
      var r = $("sr") && !$("sr").value.trim() ? { g: [] } : groups();
      $("note").className = "note" + (r.error ? " err" : ""); $("note").textContent = r.error || "";
      var g = r.g || []; $("go").disabled = !!r.error || !g.length;
      $("sum").textContent = g.length ? "Creates " + plural(g.length, "file") + ": " + g.slice(0, 6).map(label).join(", ") + (g.length > 6 ? ", \u2026" : "") : "";
    }
    ctx.work.querySelectorAll(".seg button").forEach(function (b) {
      b.onclick = function () { mode = b.dataset.m; ctx.work.querySelectorAll(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); opt(); };
    });
    opt();
    onAction("go", ctx, async function () {
      var g = groups().g, items = [], bz = busy("Splitting\u2026");
      try {
        for (var i = 0; i < g.length; i++) {
          var out = await PDFLib.PDFDocument.create(), idx = [];
          for (var p = g[i][0]; p <= g[i][1]; p++) idx.push(p - 1);
          await copyInto(out, f.doc, idx);
          items.push({ name: U.base(f.name) + "_" + (g[i][0] === g[i][1] ? "page_" + g[i][0] : "pages_" + g[i][0] + "-" + g[i][1]) + ".pdf", bytes: await out.save() });
        }
        if (items.length === 1) U.download(items[0].bytes, items[0].name);
        else U.download(await U.zip(items), U.base(f.name) + "_split.zip");
        ctx.say("Done. " + plural(items.length, "file") + " created.");
      } finally { bz.done(); }
    });
  }

  /* ---------- Images to PDF ---------- */
  async function images(files, ctx) {
    var list = []; ctx.show();
    ctx.work.innerHTML = '<ul class="mlist" id="ml"></ul><input type="file" id="more" hidden accept="image/*" multiple>' +
      '<div class="opts2"><div><label class="fl" for="psz">Page size</label><select id="psz"><option value="a4">A4</option><option value="letter">Letter</option><option value="fit">Same as image</option></select></div>' +
      '<div><label class="fl" for="mar">Margin</label><select id="mar"><option value="0">None</option><option value="18" selected>Small</option><option value="36">Medium</option></select></div></div>' +
      '<div class="bar"><button type="button" class="btn ghost" id="add">+ Add more images</button><span class="grp"><span class="note" id="note"></span><button type="button" class="btn ghost" id="toJ" disabled>Use in Journal</button><button type="button" class="btn" id="go" disabled>Create and download</button></span></div>';
    $("add").onclick = function () { $("more").click(); };
    $("more").onchange = function () { add(Array.prototype.slice.call($("more").files)); $("more").value = ""; };
    function add(fs) {
      fs.forEach(function (f) { if (/^image\//.test(f.type)) list.push({ file: f, url: URL.createObjectURL(f) }); else ctx.say(f.name + " is not an image.", true); });
      draw();
    }
    function draw() {
      var ul = $("ml"); ul.innerHTML = "";
      list.forEach(function (it, i) {
        var li = document.createElement("li");
        li.innerHTML = '<span class="idx">' + (i + 1) + '</span><img class="tmb" alt="" src="' + it.url + '"><div class="fi"><span>' + esc(it.file.name) + "</span><small>" + U.size(it.file.size) + '</small></div><span class="mb"><button type="button" aria-label="Move up">\u2191</button><button type="button" aria-label="Move down">\u2193</button><button type="button" aria-label="Remove" class="del">\u00d7</button></span>';
        var b = li.querySelectorAll(".mb button");
        b[0].onclick = function () { if (i) { list.splice(i - 1, 0, list.splice(i, 1)[0]); draw(); } };
        b[1].onclick = function () { if (i < list.length - 1) { list.splice(i + 1, 0, list.splice(i, 1)[0]); draw(); } };
        b[2].onclick = function () { URL.revokeObjectURL(it.url); list.splice(i, 1); draw(); };
        ul.appendChild(li);
      });
      $("note").textContent = list.length ? plural(list.length, "image") : ""; $("go").disabled = $("toJ").disabled = !list.length;
    }
    async function bitmap(file) {
      try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
      catch (e) { return await new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = URL.createObjectURL(file); }); }
    }
    async function build() {
      var out = await PDFLib.PDFDocument.create(), size = $("psz").value, m = +$("mar").value;
      for (var i = 0; i < list.length; i++) {
        var bm = await bitmap(list[i].file), w = bm.width, h = bm.height, k = Math.min(1, 2480 / Math.max(w, h));
        var cv = document.createElement("canvas"); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        var c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(bm, 0, 0, cv.width, cv.height);
        var blob = await new Promise(function (r) { cv.toBlob(r, "image/jpeg", 0.9); });
        var img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        var pw, ph;
        if (size === "fit") { pw = Math.max(100, cv.width * 0.75 + 2 * m); ph = Math.max(100, cv.height * 0.75 + 2 * m); }
        else { var base = size === "a4" ? [595.28, 841.89] : [612, 792]; var land = cv.width > cv.height; pw = land ? base[1] : base[0]; ph = land ? base[0] : base[1]; }
        var page = out.addPage([pw, ph]), aw = pw - 2 * m, ah = ph - 2 * m, s = Math.min(aw / cv.width, ah / cv.height), dw = cv.width * s, dh = cv.height * s;
        page.drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
        if (bm.close) bm.close();
      }
      return await out.save();
    }
    async function run(send) {
      var bz = busy("Creating your PDF\u2026");
      try {
        var bytes = await build(), name = U.base(list[0].file.name) + (list.length > 1 ? "_and_more" : "") + ".pdf";
        if (send) window.JM.addPractical([new File([bytes], name, { type: "application/pdf" })]); else { U.download(bytes, name); ctx.say("Done. " + plural(list.length, "page") + " saved."); }
      } finally { bz.done(); }
    }
    onAction("go", ctx, function () { return run(false); });
    onAction("toJ", ctx, function () { return run(true); });
    add(files);
  }

  /* ---------- Word to PDF ---------- */
  async function word(files, ctx) {
    var file = files[0];
    if (!/\.docx$/i.test(file.name)) throw new Error("Please upload a .docx file. Older .doc files can\u2019t be read; open them in Word and save as .docx first.");
    ctx.show();
    ctx.work.innerHTML = fbar(file.name, U.size(file.size), "DOC") + '<div class="bar"><span class="note" id="note">Ready to convert</span><button type="button" class="btn" id="go">Convert to PDF</button></div>';
    ctx.bindReset();
    onAction("go", ctx, async function () {
      var bz = busy("Reading your document\u2026"), bytes;
      try { bytes = await docxToPdf(await file.arrayBuffer(), bz.set); }
      catch (e) { bz.done(); ctx.say(e && e.message ? e.message : "Conversion failed.", true); return; }
      bz.done();
      var name = U.base(file.name) + ".pdf";
      ctx.work.innerHTML = fbar(file.name, "Converted \u00b7 " + U.size(bytes.length), "DOC") + '<div class="bar"><span class="note">Your PDF is ready</span><span class="grp"><button type="button" class="btn ghost" id="toJ">Use in Journal</button><button type="button" class="btn" id="dl">Download PDF</button></span></div>';
      ctx.bindReset();
      $("dl").onclick = function () { U.download(bytes, name); };
      $("toJ").onclick = function () { window.JM.addPractical([new File([bytes], name, { type: "application/pdf" })]); };
      U.download(bytes, name); ctx.say("Done. Your PDF is downloading.");
    });
  }
  async function docxToPdf(buf, progress) {
    var res = await mammoth.convertToHtml({ arrayBuffer: buf });
    var src = document.createElement("div"); src.innerHTML = res.value;
    if (!src.textContent.trim() && !src.querySelector("img")) throw new Error("No readable content was found in this Word file.");
    window.scrollTo(0, 0);
    var host = document.createElement("div"); host.className = "wd-host"; document.body.appendChild(host);
    try {
      src.className = "wd-page"; host.appendChild(src);
      await Promise.all(Array.prototype.map.call(src.querySelectorAll("img"), function (im) { return im.decode ? im.decode().catch(function () {}) : 0; }));
      var PH = 1123, pages = [];
      function np() { var p = document.createElement("div"); p.className = "wd-page"; host.appendChild(p); pages.push(p); return p; }
      var cur = np();
      Array.prototype.slice.call(src.children).forEach(function (el) {
        cur.appendChild(el);
        if (cur.offsetHeight > PH && cur.children.length > 1) { cur.removeChild(el); cur = np(); cur.appendChild(el); }
      });
      host.removeChild(src);
      var out = await PDFLib.PDFDocument.create(), W = 595.28, H = 841.89;
      for (var i = 0; i < pages.length; i++) {
        progress("Converting page " + (i + 1) + " of " + pages.length + "\u2026");
        var cv = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true, scrollX: 0, scrollY: 0 });
        var ph = Math.round(cv.width * H / W);
        for (var y = 0; y < cv.height; y += ph) {
          var sh = Math.min(ph, cv.height - y), sc = document.createElement("canvas"); sc.width = cv.width; sc.height = sh;
          var c = sc.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, sc.width, sh); c.drawImage(cv, 0, y, cv.width, sh, 0, 0, cv.width, sh);
          var blob = await new Promise(function (r) { sc.toBlob(r, "image/jpeg", 0.88); });
          var im = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
          out.addPage([W, H]).drawImage(im, { x: 0, y: H - sh * W / cv.width, width: W, height: sh * W / cv.width });
        }
      }
      return await out.save();
    } finally { host.remove(); }
  }

  /* ---------- Extract pages ---------- */
  async function extract(files, ctx) {
    var f = await U.loadPdf(files[0]); ctx.show();
    var on = new Set(), cells = {};
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<label class="fl" for="rng">Pages to keep</label><input id="rng" placeholder="e.g. 1-3, 7" autocomplete="off">' +
      '<p class="hint">Or click pages below to select them.' + (f.n > 300 ? " The preview shows the first 300 pages. Use the box above for the rest." : "") + '</p><div class="tgrid" id="grid"></div>' +
      '<div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go" disabled>Extract pages and download</button></div>';
    ctx.bindReset();
    function paint(i) { if (cells[i]) cells[i].classList.toggle("sel", on.has(i)); }
    function sync(fromInput) {
      for (var i in cells) paint(+i);
      if (!fromInput) $("rng").value = compact(on);
      var k = on.size; $("go").disabled = k === 0;
      $("note").className = "note"; $("note").textContent = k ? plural(k, "page") + " selected" : "";
    }
    $("rng").addEventListener("input", function () {
      var r = U.parseRanges($("rng").value, f.n);
      if (r.error) { $("note").className = "note err"; $("note").textContent = r.error; $("go").disabled = true; return; }
      on = new Set(r.pages); sync(true);
    });
    U.thumbs(f.bytes, $("grid"), function (cv, i) {
      var c = thumbCell(cv, i); c.insertAdjacentHTML("beforeend", '<span class="x" aria-hidden="true">\u2713</span>');
      c.setAttribute("aria-label", "Page " + i); c.onclick = function () { on.has(i) ? on.delete(i) : on.add(i); paint(i); sync(); };
      cells[i] = c; paint(i); $("grid").appendChild(c);
    });
    onAction("go", ctx, async function () {
      var idx = Array.from(on).sort(function (a, b) { return a - b; }).map(function (p) { return p - 1; });
      var out = await PDFLib.PDFDocument.create(); await copyInto(out, f.doc, idx);
      U.download(await out.save(), U.base(f.name) + "_extracted.pdf"); ctx.say("Done. " + plural(idx.length, "page") + " saved.");
    });
  }

  /* ---------- Reorder pages ---------- */
  async function reorder(files, ctx) {
    var f = await U.loadPdf(files[0]);
    if (f.n > 300) throw new Error("Reordering works on PDFs up to 300 pages. Use Split PDF first for longer files.");
    ctx.show();
    var order = Array.from({ length: f.n }, function (_, i) { return i + 1; }), cells = {};
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<div class="bar top"><span class="note">Move pages with the arrows</span><span class="grp"><button type="button" class="btn ghost" id="rev">Reverse order</button><button type="button" class="btn ghost" id="rst">Reset</button></span></div>' +
      '<div class="tgrid" id="grid"></div><div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go" disabled>Save and download</button></div>';
    ctx.bindReset();
    function draw() {
      var g = $("grid");
      order.forEach(function (p, k) {
        var c = cells[p]; if (!c) return;
        c.querySelector(".n").textContent = (k + 1) + (p !== k + 1 ? " \u00b7 was " + p : ""); g.appendChild(c);
      });
      var moved = order.some(function (p, k) { return p !== k + 1; });
      $("go").disabled = !moved; $("note").textContent = moved ? "Order changed" : "";
    }
    function mv(p, d) { var k = order.indexOf(p), j = k + d; if (j < 0 || j >= order.length) return; order.splice(j, 0, order.splice(k, 1)[0]); draw(); }
    $("rev").onclick = function () { order.reverse(); draw(); };
    $("rst").onclick = function () { order.sort(function (a, b) { return a - b; }); draw(); };
    U.thumbs(f.bytes, $("grid"), function (cv, i) {
      var c = thumbCell(cv, i, "div");
      c.insertAdjacentHTML("beforeend", '<span class="rb"><button type="button" aria-label="Move page ' + i + ' earlier">\u25c0</button><button type="button" aria-label="Move page ' + i + ' later">\u25b6</button></span>');
      var b = c.querySelectorAll(".rb button"); b[0].onclick = function () { mv(i, -1); }; b[1].onclick = function () { mv(i, 1); };
      cells[i] = c; draw();
    });
    onAction("go", ctx, async function () {
      var out = await PDFLib.PDFDocument.create(); await copyInto(out, f.doc, order.map(function (p) { return p - 1; }));
      U.download(await out.save(), U.base(f.name) + "_reordered.pdf"); ctx.say("Done. Your reordered PDF is downloading.");
    });
  }

  /* ---------- PDF to images ---------- */
  async function pdf2img(files, ctx) {
    var f = await U.loadPdf(files[0]); ctx.show();
    var fmt = "jpg";
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<div class="opts2"><div><label class="fl">Format</label><div class="seg" role="group" aria-label="Image format"><button type="button" data-m="jpg" aria-pressed="true">JPG</button><button type="button" data-m="png" aria-pressed="false">PNG</button></div></div>' +
      '<div><label class="fl" for="qs">Quality</label><select id="qs"><option value="2">Standard</option><option value="3">High (larger files)</option></select></div></div>' +
      '<label class="fl" for="rng">Pages <span class="opt">(leave empty for all)</span></label><input id="rng" placeholder="e.g. 1-3, 7" autocomplete="off">' +
      '<div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go">Convert and download</button></div>';
    ctx.bindReset();
    ctx.work.querySelectorAll(".seg button").forEach(function (b) {
      b.onclick = function () { fmt = b.dataset.m; ctx.work.querySelectorAll(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); };
    });
    $("rng").addEventListener("input", function () {
      var r = $("rng").value.trim() ? U.parseRanges($("rng").value, f.n) : {};
      $("note").className = "note" + (r.error ? " err" : ""); $("note").textContent = r.error || ""; $("go").disabled = !!r.error;
    });
    onAction("go", ctx, async function () {
      var pages = $("rng").value.trim() ? U.parseRanges($("rng").value, f.n).pages : Array.from({ length: f.n }, function (_, i) { return i + 1; });
      var scale = +$("qs").value, mime = fmt === "png" ? "image/png" : "image/jpeg", bz = busy("Converting\u2026"), items = [];
      try {
        var pdf = await pdfjsLib.getDocument({ data: f.bytes.slice() }).promise;
        for (var k = 0; k < pages.length; k++) {
          bz.set("Page " + (k + 1) + " of " + pages.length + "\u2026");
          var pg = await pdf.getPage(pages[k]), vp = pg.getViewport({ scale: scale }), cv = document.createElement("canvas");
          cv.width = vp.width; cv.height = vp.height;
          var c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
          await pg.render({ canvasContext: c, viewport: vp }).promise;
          var blob = await new Promise(function (r) { cv.toBlob(r, mime, 0.92); });
          items.push({ name: U.base(f.name) + "_page_" + String(pages[k]).padStart(2, "0") + "." + (fmt === "png" ? "png" : "jpg"), blob: blob, bytes: new Uint8Array(await blob.arrayBuffer()) });
          cv.width = cv.height = 0;
        }
        if (items.length === 1) U.download(items[0].blob, items[0].name);
        else U.download(await U.zip(items), U.base(f.name) + "_images.zip");
        ctx.say("Done. " + plural(items.length, "image") + " saved.");
      } finally { bz.done(); }
    });
  }

  /* ---------- Compress PDF ---------- */
  async function compress(files, ctx) {
    var f = await U.loadPdf(files[0]); ctx.show();
    var LV = { hi: { s: 2, q: 0.8 }, bal: { s: 1.4, q: 0.6 }, min: { s: 1, q: 0.45 } }, lv = "bal";
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<label class="fl">Compression level</label><div class="seg" style="grid-template-columns:repeat(3,1fr)" role="group" aria-label="Compression level">' +
      '<button type="button" data-m="hi" aria-pressed="false">Light</button><button type="button" data-m="bal" aria-pressed="true">Balanced</button><button type="button" data-m="min" aria-pressed="false">Strong</button></div>' +
      '<div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go">Compress and download</button></div>';
    ctx.bindReset();
    ctx.work.querySelectorAll(".seg button").forEach(function (b) {
      b.onclick = function () { lv = b.dataset.m; ctx.work.querySelectorAll(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); };
    });
    onAction("go", ctx, async function () {
      var bz = busy("Compressing\u2026"), bytes;
      try {
        var pdf = await pdfjsLib.getDocument({ data: f.bytes.slice() }).promise, out = await PDFLib.PDFDocument.create();
        for (var i = 1; i <= pdf.numPages; i++) {
          bz.set("Page " + i + " of " + pdf.numPages + "\u2026");
          var pg = await pdf.getPage(i), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: LV[lv].s }), cv = document.createElement("canvas");
          cv.width = vp.width; cv.height = vp.height;
          var c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
          await pg.render({ canvasContext: c, viewport: vp }).promise;
          var blob = await new Promise(function (r) { cv.toBlob(r, "image/jpeg", LV[lv].q); });
          var im = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
          out.addPage([v1.width, v1.height]).drawImage(im, { x: 0, y: 0, width: v1.width, height: v1.height });
          cv.width = cv.height = 0;
        }
        bytes = await out.save();
      } finally { bz.done(); }
      if (bytes.length >= f.size) { ctx.say("This PDF is already compact (" + U.size(f.size) + "), so the result would not be smaller. Nothing was downloaded. Try a stronger level.", true); return; }
      var pct = Math.round((1 - bytes.length / f.size) * 100);
      U.download(bytes, U.base(f.name) + "_compressed.pdf");
      ctx.say("Done. " + U.size(f.size) + " \u2192 " + U.size(bytes.length) + " (" + pct + "% smaller).");
    });
  }

  /* ---------- shared first-page preview for Page numbers / Watermark ---------- */
  async function paintFirst(bytes, host) {
    var pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise, pg = await pdf.getPage(1), v1 = pg.getViewport({ scale: 1 });
    var vp = pg.getViewport({ scale: 520 / v1.width }), cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
    var c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: c, viewport: vp }).promise; return cv;
  }

  /* ---------- Page numbers ---------- */
  async function numbers(files, ctx) {
    var f = await U.loadPdf(files[0]); ctx.show();
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<div class="split"><div>' +
      '<label class="fl" for="np">Position</label><select id="np"><option value="bc">Bottom centre</option><option value="br">Bottom right</option><option value="bl">Bottom left</option><option value="tc">Top centre</option><option value="tr">Top right</option><option value="tl">Top left</option></select>' +
      '<label class="fl" for="nf">Style</label><select id="nf"><option value="n">1, 2, 3</option><option value="p">Page 1, Page 2</option><option value="pn">Page 1 of ' + f.n + '</option></select>' +
      '<div class="opts2"><div><label class="fl" for="ns">Start at</label><input id="ns" inputmode="numeric" value="1" autocomplete="off"></div>' +
      '<div><label class="fl" for="nz">Size</label><select id="nz"><option value="9">Small</option><option value="11" selected>Medium</option><option value="14">Large</option></select></div></div>' +
      '<label class="chk2"><input type="checkbox" id="nk"> Skip the first page</label></div><div class="pvw" id="pv"></div></div>' +
      '<div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go">Add numbers and download</button></div>';
    ctx.bindReset();
    function o() { var s = parseInt($("ns").value, 10); return { pos: $("np").value, format: $("nf").value, start: s >= 0 ? s : 1, size: +$("nz").value, skipFirst: $("nk").checked }; }
    var tk = 0, tm;
    function preview() {
      clearTimeout(tm); tm = setTimeout(async function () {
        if (!ctx.work.isConnected) return;
        var my = ++tk;
        try {
          var op = o(), skip = op.skipFirst && f.n > 1;
          var one = await PdfTools.keepPages(PDFLib, f.bytes, [skip ? 1 : 0]);
          var res = await PdfTools.addNumbers(PDFLib, one, Object.assign({}, op, { skipFirst: false, count: f.n - (op.skipFirst ? 1 : 0) }));
          var cv = await paintFirst(res, $("pv")); if (my !== tk || !ctx.work.isConnected) return; $("pv").innerHTML = ""; $("pv").appendChild(cv);
        } catch (e) { /* preview only */ }
      }, 200);
    }
    ["np", "nf", "ns", "nz", "nk"].forEach(function (id) { $(id).addEventListener("input", preview); $(id).addEventListener("change", preview); });
    preview();
    onAction("go", ctx, async function () {
      var bz = busy("Adding page numbers\u2026");
      try { U.download(await PdfTools.addNumbers(PDFLib, f.bytes, o()), U.base(f.name) + "_numbered.pdf"); ctx.say("Done. Your numbered PDF is downloading."); }
      finally { bz.done(); }
    });
  }

  /* ---------- Watermark ---------- */
  async function watermark(files, ctx) {
    var f = await U.loadPdf(files[0]); ctx.show();
    ctx.work.innerHTML = fbar(f.name, plural(f.n, "page") + " \u00b7 " + U.size(f.size)) +
      '<div class="split"><div>' +
      '<label class="fl" for="wt">Watermark text</label><input id="wt" value="CONFIDENTIAL" maxlength="40" autocomplete="off">' +
      '<div class="opts2"><div><label class="fl" for="wz">Size</label><select id="wz"><option value="40">Small</option><option value="64" selected>Medium</option><option value="96">Large</option></select></div>' +
      '<div><label class="fl" for="wo">Strength</label><select id="wo"><option value="0.15">Light</option><option value="0.3" selected>Medium</option><option value="0.55">Strong</option></select></div></div>' +
      '<div class="opts2"><div><label class="fl" for="wa">Direction</label><select id="wa"><option value="45" selected>Diagonal</option><option value="0">Horizontal</option></select></div>' +
      '<div><label class="fl" for="wc">Colour</label><select id="wc"><option value="g" selected>Grey</option><option value="r">Red</option><option value="b">Blue</option></select></div></div>' +
      '</div><div class="pvw" id="pv"></div></div>' +
      '<div class="bar"><span class="note" id="note"></span><button type="button" class="btn" id="go">Add watermark and download</button></div>';
    ctx.bindReset();
    var COL = { g: [0.45, 0.45, 0.45], r: [0.8, 0.1, 0.1], b: [0.1, 0.25, 0.8] };
    function o() { return { text: $("wt").value.trim(), size: +$("wz").value, opacity: +$("wo").value, angle: +$("wa").value, color: COL[$("wc").value] }; }
    var first = await PdfTools.keepPages(PDFLib, f.bytes, [0]), tk = 0, tm;
    function check() {
      var bad = /[^\u0020-\u007e\u00a0-\u00ff]/.test($("wt").value);
      $("note").className = "note" + (bad ? " err" : ""); $("note").textContent = bad ? "Use English letters, numbers and common symbols." : "";
      $("go").disabled = bad || !$("wt").value.trim(); return !$("go").disabled;
    }
    function preview() {
      if (!check()) return;
      clearTimeout(tm); tm = setTimeout(async function () {
        if (!ctx.work.isConnected) return;
        var my = ++tk;
        try { var cv = await paintFirst(await PdfTools.watermark(PDFLib, first, o()), $("pv")); if (my !== tk || !ctx.work.isConnected) return; $("pv").innerHTML = ""; $("pv").appendChild(cv); } catch (e) { /* preview only */ }
      }, 200);
    }
    ["wt", "wz", "wo", "wa", "wc"].forEach(function (id) { $(id).addEventListener("input", preview); $(id).addEventListener("change", preview); });
    preview();
    onAction("go", ctx, async function () {
      var bz = busy("Adding watermark\u2026");
      try { U.download(await PdfTools.watermark(PDFLib, f.bytes, o()), U.base(f.name) + "_watermarked.pdf"); ctx.say("Done. Your watermarked PDF is downloading."); }
      finally { bz.done(); }
    });
  }

  route();
})();
