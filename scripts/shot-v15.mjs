// v1.5 확인: 코트 아웃 띠·설명 줄 — 복식(서브 측 0·1, 리시브 측 0·1, 혼복 서브)과 단식 미리보기(스텁 파일). 사용: node scripts/shot-v15.mjs [preview.html]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v15"; mkdirSync(outDir, { recursive: true });
const preview = process.argv[2] || "/tmp/preview/index.html";
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); };
const next = async () => { await page.getByRole("button", { name: "다음" }).click(); await page.waitForTimeout(2200); };
const tab = async (re) => { await page.locator(".tab", { hasText: re }).click(); await page.waitForTimeout(2600); };
const rows = [];
const check = async (tag, expectZones, expectText) => {
  const title = await page.locator("#stepTitle").textContent();
  const zones = await page.$$eval('#court rect[data-zone="out"]', (els) => els.map((r) => ({ x: +r.getAttribute("x"), y: +r.getAttribute("y"), w: +r.getAttribute("width"), h: +r.getAttribute("height") })));
  const note = (await page.locator("#courtNote").textContent()).trim();
  const ok = zones.length === expectZones && note.startsWith(expectText);
  rows.push({ tag, title, zones: zones.length, note, ok });
  console.log(ok ? "OK " : "NG ", tag, "|", title, "| 띠", zones.length, JSON.stringify(zones), "|", note);
};
const start = async (sport) => { await page.getByRole("button", { name: sport, exact: true }).click(); await page.getByRole("button", { name: "D조(초급)", exact: true }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600); };
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
await start("남복/여복");
await check("복식 서브 측 0(서브)", 1, "복식 서브"); await shot("dbl-serve0");
await next(); await check("복식 서브 측 1(랠리)", 0, "복식:"); await shot("dbl-serve1");
await tab(/숏서브 · 리시브 측/); await check("복식 리시브 측 0(준비)", 0, "복식:"); await next(); await check("복식 리시브 측 1(상대 서브)", 1, "복식 서브"); await shot("dbl-recv1");
await tab(/롱 서브 · 서브 측/); await check("복식 롱 서브 0", 1, "복식 서브"); await shot("dbl-long0");
await page.locator("#btnSettings").click(); await page.waitForTimeout(400); await start("남복/여복"); // 설정 화면 열림 확인용(종목 버튼)
console.log("버전:", await page.locator("#version").textContent());
// 단식 미리보기(스텁 데이터 파일)
await page.goto("file://" + preview); await page.waitForTimeout(500);
const sportBtns = await page.$$eval("#sportRow button", (bs) => bs.map((b) => b.textContent + (b.disabled ? "(잠금)" : "")));
console.log("시작 화면 종목 버튼:", sportBtns);
await page.getByRole("button", { name: "단식", exact: true }).click(); await shot("start-singles-btn");
await page.getByRole("button", { name: "D조(초급)", exact: true }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600);
await check("단식 미리보기 0(서브)", 2, "단식 서브"); await shot("sgl-serve0");
await next(); await check("단식 미리보기 1(랠리)", 2, "단식:"); await shot("sgl-rally1");
console.log("헤더:", await page.locator("#btnSettings").textContent());
const bad = rows.filter((r) => !r.ok);
console.log("문제:", bad.length ? bad : "없음");
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
process.exit(bad.length || errors.length ? 1 : 0);
