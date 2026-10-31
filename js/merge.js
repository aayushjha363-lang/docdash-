/* Builds the final PDF.
   repeat : [sheet][practical page 1][sheet][practical page 2] ...    else [sheet][all practical pages]
   fields : [{ k, text, fx, fy }] values printed on every journal sheet (fx, fy = fraction of the page, top-left of the text)
   theory : one extra journal sheet at the very end */
(function (root) {
  "use strict";
  async function build(o) {
    var L = o.L, out = await L.PDFDocument.create();
    var practical = [];
    for (var i = 0; i < o.files.length; i++) {
      var src = await L.PDFDocument.load(o.files[i], { ignoreEncryption: true });
      (await out.copyPages(src, src.getPageIndices())).forEach(function (p) { practical.push(p); });
    }
    var emb = null, sw = 0, sh = 0, hb = null;
    if (o.sheetBytes) {
      var sd = await L.PDFDocument.load(o.sheetBytes, { ignoreEncryption: true });
      var sp = sd.getPage(0); sw = sp.getWidth(); sh = sp.getHeight();
      emb = await out.embedPage(sp);
      hb = await out.embedFont(L.StandardFonts.HelveticaBold);
    }
    function addSheet(k) {
      var pg = out.addPage([sw, sh]); pg.drawPage(emb);
      var sc = sw / 595.32;
      (o.fields || []).forEach(function (f) {
        var t = f.text;
        if (f.k === "page" && o.repeat) { var n = parseInt(t, 10); if (!isNaN(n)) t = String(n + k); }
        try {
          var size = 11 * sc, x = f.fx * sw, room = sw - x - 8 * sc, w = hb.widthOfTextAtSize(t, size);
          if (w > room) size = Math.max(6 * sc, size * room / w);
          pg.drawText(t, { x: x, y: sh - f.fy * sh - size * 0.82, size: size, font: hb, color: L.rgb(.12, .12, .45) });
        } catch (e) { /* character the PDF font cannot draw: skip it */ }
      });
    }
    if (o.repeat) {
      practical.forEach(function (p, k) { if (emb) addSheet(k); out.addPage(p); });
      if (!practical.length && emb) addSheet(0);
    } else {
      if (emb) addSheet(0);
      practical.forEach(function (p) { out.addPage(p); });
    }
    if (o.theory && emb) addSheet(practical.length);
    if (o.stamp && out.getPageCount()) {
      var f = await out.embedFont(L.StandardFonts.TimesRoman), b = o.start > 0 ? o.start : 1;
      out.getPages().forEach(function (p, i) {
        var t = String(b + i);
        p.drawText(t, { x: p.getWidth() / 2 - f.widthOfTextAtSize(t, 10) / 2, y: 16, size: 10, font: f, color: L.rgb(0, 0, 0) });
      });
    }
    return await out.save();
  }
  root.JournalMerge = { build: build };
  if (typeof module !== "undefined") module.exports = root.JournalMerge;
})(typeof window !== "undefined" ? window : globalThis);
