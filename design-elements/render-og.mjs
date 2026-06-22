// Renders the OG SVG to a pixel-perfect 1200x630 PNG using Chromium so the
// real Geist / Geist Mono web fonts are applied. Run: node design-elements/render-og.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(path.join(dir, "shortcutting_og_image.svg"), "utf8");
const outputs = [
  path.join(dir, "..", "public", "og-image.png"),
  path.join(dir, "..", "public", "og-image.svg"),
];

const html = `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0}html,body{width:1200px;height:630px;overflow:hidden}svg{display:block}</style>
</head><body>${svg}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
const { writeFileSync } = await import("node:fs");
writeFileSync(outputs[0], buf);
// keep the served .svg identical to the design source
writeFileSync(outputs[1], svg);
await browser.close();
console.log("wrote", outputs[0]);
