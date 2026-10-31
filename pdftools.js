/* Core PDF operations (no DOM). Used by tools.js and testable in Node. */
(function (root) {
  "use strict";
  var A4 = [595.28, 841.89], LETTER = [612, 792];

  /* "1-3, 5, 8-" -> { pages: [0,1,2,4,7...] } (0-based, in the order typed) */
  function parseRanges(str, max) {
    var s = (str || "").replace(/\s+/g, "");
    if (!s) return { error: "Enter at least one page or range." };
    var out = [], parts = s.split(",");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; if (!p) continue;
      var m = /^(\d+)?-(\d+)?$/.exec(p), a, b;
      if (m && (m[1] || m[2])) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : max; }
      else if (/^\d+$/.test(p)) { a = b = +p; }
      else return { error: "\u201c" + p + "\u201d is not valid. Use numbers like 1-3, 5." };
      if (a < 1 || a > max || b < 1 || b > max)
        return { error: "Page " + ((a < 1 || a > max) ? a : b) + " is outside 1\u2013" + max + "." };
      if (a > b) return { error: "Range \u201c" + p + "\u201d is backwards." };
      for (var k = a; k <= b; k++) out.push(k - 1);
    }
    return out.length ? { pages: out } : { error: "Enter at least one page or range." };
  }

  /* mode: "each" | "every" (value = N) | "ranges" (value = "1-3, 4-6, 9") */
  function splitPlan(mode, value, total) {
    var parts = [], i;
    if (mode === "each") {
      for (i = 0; i < total; i++) parts.push({ label: "Page " + (i + 1), indices: [i] });
    } else if (mode === "every") {
      var n = parseInt(value, 10);
      if (!(n >= 1)) return { error: "Enter how many pages go in each file." };
      for (i = 0; i < total; i += n) {
        var idx = []; for (var k = i; k < Math.min(total, i + n); k++) idx.push(k);
        parts.push({ label: idx.length > 1 ? "Pages " + (idx[0] + 1) + "\u2013" + (idx[idx.length - 1] + 1) : "Page " + (idx[0] + 1), indices: idx });
      }
    } else {
      var segs = (value || "").split(",").filter(function (x) { return x.trim(); });
      if (!segs.length) return { error: "Enter at least one range, like 1-3, 4-6." };
      for (i = 0; i < segs.length; i++) {
        var r = parseRanges(segs[i], total);
        if (r.error) return r;
        parts.push({ label: "Pages " + segs[i].trim(), indices: r.pages });
      }
    }
    return { parts: parts };
  }

  async function load(L, bytes) { return L.PDFDocument.load(bytes, { ignoreEncryption: true }); }

  async function keepPages(L, bytes, indices) {
    var src = await load(L, bytes), out = await L.PDFDocument.create();
    (await out.copyPages(src, indices)).forEach(function (p) { out.addPage(p); });
    return out.save();
  }
  async function removePages(L, bytes, removeSet) {
    var src = await load(L, bytes), keep = [];
    for (var i = 0; i < src.getPageCount(); i++) if (!removeSet.has(i)) keep.push(i);
    if (!keep.length) throw new Error("You cannot remove every page.");
    return keepPages(L, bytes, keep);
  }
  async function merge(L, list) {
    var out = await L.PDFDocument.create();
    for (var i = 0; i < list.length; i++) {
      var src = await load(L, list[i]);
      (await out.copyPages(src, src.getPageIndices())).forEach(function (p) { out.addPage(p); });
    }
    return out.save();
  }
  /* items: [{ i: sourcePageIndex, rot: extra rotation in degrees }] in the new order */
  async function organize(L, bytes, items) {
    if (!items.length) throw new Error("Keep at least one page.");
    var src = await load(L, bytes), out = await L.PDFDocument.create();
    var pages = await out.copyPages(src, items.map(function (x) { return x.i; }));
    pages.forEach(function (p, k) {
      var r = (((p.getRotation().angle + items[k].rot) % 360) + 360) % 360;
      p.setRotation(L.degrees(r)); out.addPage(p);
    });
    return out.save();
  }

  /* o: { pos:"bc|br|bl|tc|tr|tl", format:"n|p|pn", start, size, skipFirst, count } */
  async function addNumbers(L, bytes, o) {
    var doc = await load(L, bytes), font = await doc.embedFont(L.StandardFonts.Helvetica);
    var pages = doc.getPages(), n = o.count || pages.length, first = o.skipFirst ? 1 : 0;
    var last = o.start + (n - first) - 1;
    pages.forEach(function (p, i) {
      if (i < first) return;
      var num = o.start + i - first;
      var t = o.format === "p" ? "Page " + num : o.format === "pn" ? "Page " + num + " of " + last : String(num);
      var w = font.widthOfTextAtSize(t, o.size), W = p.getWidth(), H = p.getHeight(), m = 28;
      var x = o.pos[1] === "l" ? m : o.pos[1] === "r" ? W - m - w : (W - w) / 2;
      var y = o.pos[0] === "t" ? H - m - o.size * 0.8 : m;
      p.drawText(t, { x: x, y: y, size: o.size, font: font, color: L.rgb(.2, .2, .2) });
    });
    return doc.save();
  }

  /* o: { text, size, opacity, angle, color:[r,g,b] 0-1 } */
  async function watermark(L, bytes, o) {
    var doc = await load(L, bytes), font = await doc.embedFont(L.StandardFonts.HelveticaBold);
    doc.getPages().forEach(function (p) {
      var W = p.getWidth(), H = p.getHeight(), size = o.size;
      var w = font.widthOfTextAtSize(o.text, size), maxW = o.angle ? Math.hypot(W, H) * 0.8 : W * 0.88;
      if (w > maxW) { size = size * maxW / w; w = maxW; }
      var h = size * 0.35, th = o.angle * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
      var x = W / 2 - (w / 2 * c - h * s), y = H / 2 - (w / 2 * s + h * c);
      p.drawText(o.text, { x: x, y: y, size: size, font: font, color: L.rgb(o.color[0], o.color[1], o.color[2]),
                           opacity: o.opacity, rotate: L.degrees(o.angle) });
    });
    return doc.save();
  }

  /* imgs: [{ bytes: JPEG bytes, w, h }] (pixels). o: { size:"a4|letter|fit", margin } */
  async function imagesToPdf(L, imgs, o) {
    if (!imgs.length) throw new Error("Add at least one image.");
    var out = await L.PDFDocument.create(), m = o.margin || 0;
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i], img = await out.embedJpg(im.bytes), pw, ph;
      if (o.size === "fit") { pw = im.w * 0.75 + 2 * m; ph = im.h * 0.75 + 2 * m; }
      else { var s = o.size === "letter" ? LETTER : A4, land = im.w > im.h; pw = land ? s[1] : s[0]; ph = land ? s[0] : s[1]; }
      var page = out.addPage([pw, ph]), aw = pw - 2 * m, ah = ph - 2 * m, sc = Math.min(aw / im.w, ah / im.h);
      page.drawImage(img, { x: (pw - im.w * sc) / 2, y: (ph - im.h * sc) / 2, width: im.w * sc, height: im.h * sc });
    }
    return out.save();
  }

  root.PdfTools = { parseRanges: parseRanges, splitPlan: splitPlan, keepPages: keepPages, removePages: removePages, merge: merge,
                    organize: organize, addNumbers: addNumbers, watermark: watermark, imagesToPdf: imagesToPdf };
  if (typeof module !== "undefined") module.exports = root.PdfTools;
})(typeof window !== "undefined" ? window : globalThis);
