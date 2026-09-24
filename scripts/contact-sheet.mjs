// 스크린샷 여러 장을 한 장의 그리드 이미지로 합친다 (ImageMagick/PIL 없이 chromium으로 렌더링).
// 사용: node scripts/contact-sheet.mjs /tmp/shots /tmp/sheet 5
import { chromium } from "playwright-core";
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const [inDir = "/tmp/shots", outDir = "/tmp/sheet", perSheetArg = "5"] = process.argv.slice(2);
const perSheet = Number(perSheetArg);
mkdirSync(outDir, { recursive: true });
const files = readdirSync(inDir).filter((f) => f.endsWith(".png")).sort();

const browser = await chromium.launch({
  executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"),
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 2260, height: 1040 } });
for (let i = 0; i < files.length; i += perSheet) {
  const group = files.slice(i, i + perSheet);
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222;font-family:sans-serif">
  <div style="display:flex;gap:12px;padding:12px">${group
    .map(
      (f) => `<figure style="margin:0;text-align:center;color:#eee;font-size:18px">
      <img src="file://${resolve(inDir, f)}" style="width:440px;display:block;border:1px solid #555">
      <figcaption style="padding:6px">${f.replace(".png", "")}</figcaption></figure>`,
    )
    .join("")}</div></body>`;
  const htmlPath = join(outDir, `sheet-${i / perSheet + 1}.html`);
  writeFileSync(htmlPath, html);
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  const out = join(outDir, `sheet-${i / perSheet + 1}.png`);
  await page.screenshot({ path: out, fullPage: true });
  console.log("saved", out, group.join(", "));
}
await browser.close();
