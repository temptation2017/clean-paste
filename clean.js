/**
 * clean-paste: detect & strip invisible / suspicious Unicode from pasted text.
 * Pure browser / Node-compatible (no DOM dependency in this module).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CleanPaste = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Known labels (Chinese short names). Key = code point number. */
  var LABELS = {
    0xfeff: "BOM / 零宽不换行空格",
    0x200b: "零宽空格 ZWSP",
    0x200c: "零宽不连字 ZWNJ",
    0x200d: "零宽连字 ZWJ",
    0x2060: "词连接符 WJ",
    0x00ad: "软连字符 Soft Hyphen",
    0x202a: "从左到右嵌入 LRE",
    0x202b: "从右到左嵌入 RLE",
    0x202c: "弹出方向格式 PDF",
    0x202d: "从左到右强制 LRO",
    0x202e: "从右到左强制 RLO",
    0x2066: "从左到右隔离 LRI",
    0x2067: "从右到左隔离 RLI",
    0x2068: "第一强隔离 FSI",
    0x2069: "弹出方向隔离 PDI",
    0xfffd: "替换字符 �",
    0x00a0: "不换行空格 NBSP",
    0x202f: "窄不换行空格 NNBSP",
    0x3000: "表意空格 Ideographic Space",
    0x2000: "En Quad",
    0x2001: "Em Quad",
    0x2002: "En Space",
    0x2003: "Em Space",
    0x2004: "三分之一 Em 空格",
    0x2005: "四分之一 Em 空格",
    0x2006: "六分之一 Em 空格",
    0x2007: "数字空格",
    0x2008: "标点空格",
    0x2009: "瘦空格 Thin Space",
    0x200a: "发丝空格 Hair Space",
    0x205f: "中等数学空格",
    0x180e: "蒙古元音分隔符",
    0x200e: "从左到右标记 LRM",
    0x200f: "从右到左标记 RLM",
    0x2061: "函数应用",
    0x2062: "不可见乘号",
    0x2063: "不可见分隔符",
    0x2064: "不可见加号",
    0x034f: "组合用字素连接符 CGJ",
    0x061c: "阿拉伯字母标记 ALM",
    0x115f: "谚文字母填充",
    0x1160: "谚文元音填充",
    0x17b4: "高棉元音固有 AQAA",
    0x17b5: "高棉元音固有 AQAA2",
    0x180b: "蒙古自由变体选择符 FVS1",
    0x180c: "蒙古自由变体选择符 FVS2",
    0x180d: "蒙古自由变体选择符 FVS3",
    0xfe00: "变体选择符 VS1",
    0xfe01: "变体选择符 VS2",
    0xfe02: "变体选择符 VS3",
    0xfe03: "变体选择符 VS4",
    0xfe04: "变体选择符 VS5",
    0xfe05: "变体选择符 VS6",
    0xfe06: "变体选择符 VS7",
    0xfe07: "变体选择符 VS8",
    0xfe08: "变体选择符 VS9",
    0xfe09: "变体选择符 VS10",
    0xfe0a: "变体选择符 VS11",
    0xfe0b: "变体选择符 VS12",
    0xfe0c: "变体选择符 VS13",
    0xfe0d: "变体选择符 VS14",
    0xfe0e: "变体选择符 VS15",
    0xfe0f: "变体选择符 VS16",
  };

  /** Glyph tags shown in visual preview */
  var GLYPHS = {
    0xfeff: "BOM",
    0x200b: "ZWSP",
    0x200c: "ZWNJ",
    0x200d: "ZWJ",
    0x2060: "WJ",
    0x00ad: "SHY",
    0x202a: "LRE",
    0x202b: "RLE",
    0x202c: "PDF",
    0x202d: "LRO",
    0x202e: "RLO",
    0x2066: "LRI",
    0x2067: "RLI",
    0x2068: "FSI",
    0x2069: "PDI",
    0xfffd: "FFFD",
    0x00a0: "NBSP",
    0x202f: "NNBSP",
    0x3000: "IDSP",
    0x200e: "LRM",
    0x200f: "RLM",
  };

  /** Weird spaces that can be normalized to U+0020 when option is on */
  var WEIRD_SPACES = {
    0x00a0: true,
    0x202f: true,
    0x3000: true,
    0x2000: true,
    0x2001: true,
    0x2002: true,
    0x2003: true,
    0x2004: true,
    0x2005: true,
    0x2006: true,
    0x2007: true,
    0x2008: true,
    0x2009: true,
    0x200a: true,
    0x205f: true,
  };

  function isAlwaysSuspicious(cp) {
    if (cp === 0xfeff) return true;
    if (cp === 0x200b || cp === 0x200c || cp === 0x200d || cp === 0x2060) return true;
    if (cp === 0x00ad) return true;
    if (cp >= 0x202a && cp <= 0x202e) return true;
    if (cp >= 0x2066 && cp <= 0x2069) return true;
    if (cp === 0xfffd) return true;
    if (cp === 0x200e || cp === 0x200f) return true;
    if (cp === 0x061c) return true;
    if (cp === 0x034f) return true;
    if (cp === 0x180e) return true;
    if (cp >= 0x2061 && cp <= 0x2064) return true;
    if (cp === 0x115f || cp === 0x1160) return true;
    if (cp === 0x17b4 || cp === 0x17b5) return true;
    if (cp >= 0x180b && cp <= 0x180d) return true;
    if (cp >= 0xfe00 && cp <= 0xfe0f) return true;
    // Other common Cf format chars in BMP ranges often used for stealth
    if (cp >= 0xe0000 && cp <= 0xe007f) return true; // Tags
    if (cp >= 0xe0100 && cp <= 0xe01ef) return true; // Variation selectors supp.
    return false;
  }

  function isWeirdSpace(cp) {
    return !!WEIRD_SPACES[cp];
  }

  function codePointLabel(cp) {
    if (LABELS[cp]) return LABELS[cp];
    if (cp >= 0xe0000 && cp <= 0xe007f) return "标签字符 Tag";
    if (cp >= 0xe0100 && cp <= 0xe01ef) return "补充变体选择符";
    if (isWeirdSpace(cp)) return "非常规空格";
    return "可疑/格式字符";
  }

  function glyphTag(cp) {
    if (GLYPHS[cp]) return GLYPHS[cp];
    if (isWeirdSpace(cp)) return "SP";
    return "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  }

  function toUPlus(cp) {
    var hex = cp.toString(16).toUpperCase();
    if (hex.length < 4) hex = ("0000" + hex).slice(-4);
    return "U+" + hex;
  }

  /**
   * Scan text. Returns { total, findings: [{cp, uPlus, label, count, contexts[]}], chars: [{cp, index, kind}] }
   * kind: 'bad' | 'weird-space' | 'ok'
   */
  function scan(text, opts) {
    opts = opts || {};
    var flagWeird = !!opts.normalizeWeirdSpaces;
    var byCp = Object.create(null);
    var chars = [];
    var total = 0;
    var i = 0;
    var len = text.length;

    while (i < len) {
      var cp = text.codePointAt(i);
      var width = cp > 0xffff ? 2 : 1;
      var kind = "ok";
      var suspicious = isAlwaysSuspicious(cp);
      var weird = isWeirdSpace(cp);

      if (suspicious || (flagWeird && weird) || (!flagWeird && weird)) {
        // Always report weird spaces as findings too (so user sees them),
        // but stripping depends on options in clean().
        if (suspicious || weird) {
          kind = suspicious ? "bad" : "weird-space";
          total += 1;
          if (!byCp[cp]) {
            byCp[cp] = { cp: cp, uPlus: toUPlus(cp), label: codePointLabel(cp), count: 0, contexts: [] };
          }
          byCp[cp].count += 1;
          if (byCp[cp].contexts.length < 3) {
            byCp[cp].contexts.push(makeContext(text, i, width));
          }
        }
      }

      chars.push({ cp: cp, index: i, kind: kind, width: width });
      i += width;
    }

    var findings = Object.keys(byCp)
      .map(function (k) {
        return byCp[k];
      })
      .sort(function (a, b) {
        return b.count - a.count || a.cp - b.cp;
      });

    return { total: total, findings: findings, chars: chars };
  }

  function makeContext(text, index, width) {
    var start = Math.max(0, index - 8);
    var end = Math.min(text.length, index + width + 8);
    var before = text.slice(start, index);
    var after = text.slice(index + width, end);
    // Replace invisibles in context preview with · so sample is readable
    function visible(s) {
      var out = "";
      for (var j = 0; j < s.length; ) {
        var c = s.codePointAt(j);
        var w = c > 0xffff ? 2 : 1;
        if (isAlwaysSuspicious(c) || isWeirdSpace(c)) {
          out += "·";
        } else if (c === 0x0a) {
          out += "↵";
        } else if (c === 0x09) {
          out += "⇥";
        } else {
          out += s.slice(j, j + w);
        }
        j += w;
      }
      return out;
    }
    return visible(before) + "⟦" + glyphTag(text.codePointAt(index)) + "⟧" + visible(after);
  }

  /**
   * Strip always-suspicious chars. If normalizeWeirdSpaces, map weird spaces → U+0020.
   * Keeps normal space / tab / newline.
   */
  function clean(text, opts) {
    opts = opts || {};
    var normalize = !!opts.normalizeWeirdSpaces;
    var out = "";
    var i = 0;
    var len = text.length;
    while (i < len) {
      var cp = text.codePointAt(i);
      var width = cp > 0xffff ? 2 : 1;
      if (isAlwaysSuspicious(cp)) {
        // drop
      } else if (normalize && isWeirdSpace(cp)) {
        out += " ";
      } else {
        out += text.slice(i, i + width);
      }
      i += width;
    }
    return out;
  }

  /** Build marked HTML for preview. Escapes HTML; wraps marks in <mark>. */
  function previewHtml(text, opts) {
    opts = opts || {};
    var showWeird = true; // always mark weird spaces in preview
    var html = "";
    var i = 0;
    var len = text.length;
    while (i < len) {
      var cp = text.codePointAt(i);
      var width = cp > 0xffff ? 2 : 1;
      var ch = text.slice(i, i + width);
      if (isAlwaysSuspicious(cp) || (showWeird && isWeirdSpace(cp))) {
        var cls = isAlwaysSuspicious(cp) ? "inv bad" : "inv weird";
        html +=
          '<mark class="' +
          cls +
          '" title="' +
          escapeAttr(toUPlus(cp) + " " + codePointLabel(cp)) +
          '">⟦' +
          escapeHtml(glyphTag(cp)) +
          "⟧</mark>";
      } else if (cp === 0x0a) {
        html += "<br>";
      } else if (cp === 0x09) {
        html += '<span class="tab">⇥</span>';
      } else {
        html += escapeHtml(ch);
      }
      i += width;
    }
    return html || '<span class="empty">（空）</span>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  /** Fictional sample with mixed invisibles for「填入示例」 */
  function sampleText() {
    // BOM + ZWSP + soft hyphen + bidi RLO/PDF + NBSP + ZWNJ
    return (
      "\uFEFF订单号：ORD\u200B2026\u00AD1001\n" +
      "收件人：张\u200C三\n" +
      "备注：请\u202E确认\u202C后发货\n" +
      "金额：¥1\u00A0280.00\n" +
      "备注2：正常\u2060文本\u200D混入"
    );
  }

  return {
    scan: scan,
    clean: clean,
    previewHtml: previewHtml,
    sampleText: sampleText,
    isAlwaysSuspicious: isAlwaysSuspicious,
    isWeirdSpace: isWeirdSpace,
    codePointLabel: codePointLabel,
    toUPlus: toUPlus,
    LABELS: LABELS,
  };
});
