// v0.8.3 확인: 롱 서브 주제의 제목·코트 라벨·노트에 '플릭'이 없는지. 사용: node scripts/shot-v083.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v083"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); const body = await page.evaluate(() => document.body.innerText); console.log("saved", name, "|", await page.locator("#stepTitle").textContent(), "| 화면에 플릭:", body.includes("플릭")); };
const hasNext = () => page.$$eval("button", (bs) => bs.some((b) => b.textContent.trim() === "다음" && !b.disabled && b.offsetParent !== null));
// 다음 버튼이 있으면 다음, 없으면(갈래 화면) 첫 갈래 버튼(끝에 % 표시)을 고른다
const next = async () => { if (await hasNext()) await page.getByRole("button", { name: "다음" }).click(); else await page.locator("button", { hasText: /%$/ }).first().click(); await page.waitForTimeout(2200); };
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "남복" }).click(); await page.getByRole("button", { name: "B조" }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(1500);
await page.getByRole("button", { name: /롱 서브 · 서브 측/ }).click(); await page.waitForTimeout(1800); await shot("long-serve-0");
console.log("코트 라벨:", await page.$$eval("#court text", (ts) => ts.map((t) => t.textContent).filter((t) => /서브/.test(t))));
await next(); await shot("long-serve-branch");
await page.getByRole("button", { name: /롱 서브 · 리시브 측/ }).click(); await page.waitForTimeout(1800); await next(); await shot("long-serve-recv");
console.log("version:", await page.locator("#version").textContent());
console.log("page errors:", errors.length ? errors : "none"); await browser.close();
