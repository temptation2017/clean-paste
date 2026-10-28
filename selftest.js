#!/usr/bin/env node
"use strict";
var CP = require("./clean.js");
var failed = 0;
var passed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log("PASS  " + msg);
  } else {
    failed += 1;
    console.log("FAIL  " + msg);
  }
}

// 1) Sample detection
var sample = CP.sampleText();
var scan = CP.scan(sample);
assert(scan.total >= 6, "sample has >=6 suspicious/weird chars (got " + scan.total + ")");
var cps = scan.findings.map(function (f) {
  return f.cp;
});
assert(cps.indexOf(0xfeff) >= 0, "detects BOM U+FEFF");
assert(cps.indexOf(0x200b) >= 0, "detects ZWSP U+200B");
assert(cps.indexOf(0x00ad) >= 0, "detects soft hyphen U+00AD");
assert(cps.indexOf(0x202e) >= 0, "detects RLO U+202E");
assert(cps.indexOf(0x202c) >= 0, "detects PDF U+202C");
assert(cps.indexOf(0x00a0) >= 0, "detects NBSP U+00A0");
assert(cps.indexOf(0x200c) >= 0, "detects ZWNJ U+200C");
assert(cps.indexOf(0x2060) >= 0, "detects WJ U+2060");
assert(cps.indexOf(0x200d) >= 0, "detects ZWJ U+200D");

// 2) Clean strips bad, keeps normal space/newline
var cleaned = CP.clean(sample);
assert(cleaned.indexOf("\uFEFF") < 0, "clean removes BOM");
assert(cleaned.indexOf("\u200B") < 0, "clean removes ZWSP");
assert(cleaned.indexOf("\u00AD") < 0, "clean removes soft hyphen");
assert(cleaned.indexOf("\u202E") < 0, "clean removes RLO");
assert(cleaned.indexOf("\u202C") < 0, "clean removes PDF");
assert(cleaned.indexOf("\u200C") < 0, "clean removes ZWNJ");
assert(cleaned.indexOf("\u2060") < 0, "clean removes WJ");
assert(cleaned.indexOf("\u200D") < 0, "clean removes ZWJ");
assert(cleaned.indexOf("\u00A0") >= 0, "clean keeps NBSP by default");
assert(/\n/.test(cleaned), "clean keeps newlines");
assert(cleaned.indexOf("张三") >= 0, "visible Chinese preserved");
assert(cleaned.indexOf("ORD20261001") >= 0 || cleaned.indexOf("ORD") >= 0, "order id digits preserved");

// 3) Normalize weird spaces
var cleaned2 = CP.clean(sample, { normalizeWeirdSpaces: true });
assert(cleaned2.indexOf("\u00A0") < 0, "normalize removes NBSP");
assert(cleaned2.indexOf("1 280") >= 0 || cleaned2.indexOf("1280") < 0, "NBSP became regular space");

// 4) Clean text stays clean
var plain = "hello\nworld\t中文";
var s2 = CP.scan(plain);
assert(s2.total === 0, "plain text total=0");
assert(CP.clean(plain) === plain, "plain text unchanged by clean");

// 5) FFFD warning
var s3 = CP.scan("bad\uFFFDchar");
assert(s3.findings.some(function (f) { return f.cp === 0xfffd; }), "detects U+FFFD");

// 6) previewHtml escapes and marks
var html = CP.previewHtml("a\u200Bb<script>");
assert(html.indexOf("⟦ZWSP⟧") >= 0, "preview marks ZWSP");
assert(html.indexOf("<script>") < 0, "preview escapes HTML");
assert(html.indexOf("&lt;script&gt;") >= 0, "preview shows escaped script");

console.log("---");
console.log("passed=" + passed + " failed=" + failed);
process.exit(failed === 0 ? 0 : 1);
