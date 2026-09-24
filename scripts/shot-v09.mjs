// v0.9 확인: 급수별 네트샷 깊이 — 같은 화면(초구 C-1 스트레이트 네트샷)을 B/D/A조로 찍고 경로 끝점(y2)을 콘솔에 찍는다.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v09"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); console.log("saved", name, "|", await page.locator("#stepTitle").textContent()); };
const hasNext = () => page.$$eval("button", (bs) => bs.some((b) => b.textContent.trim() === "다음" && !b.disabled && b.offsetParent !== null));
const next = async () => { await page.getByRole("button", { name: "다음" }).click(); await page.waitForTimeout(2200); };
const pick = async (re) => { await page.getByRole("button", { name: re }).click(); await page.waitForTimeout(2300); };
const pathEnd = () => page.$$eval("#court line", (ls) => ls.filter((l) => l.getAttribute("stroke") === "#222" && l.getAttribute("stroke-dasharray") === "0.18 0.12").map((l) => [+l.getAttribute("x2"), +l.getAttribute("y2")]));
const previewEnds = () => page.$$eval("#court line", (ls) => ls.filter((l) => l.getAttribute("stroke-width") === "0.09").map((l) => [+l.getAttribute("x2"), +(+l.getAttribute("y2")).toFixed(2)]));
const tierNote = () => page.$$eval("#notes li", (ls) => ls.filter((l) => l.textContent.includes("급수")).map((l) => l.textContent.trim().slice(0, 60)));
const setTier = async (t) => { await page.locator("#btnSettings").click(); await page.waitForTimeout(300); await page.getByRole("button", { name: t }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600); };
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "남복" }).click(); await page.getByRole("button", { name: "B조" }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600); // 첫 장면 애니메이션(busy)이 끝난 뒤에야 다음 버튼이 활성화됨
while (await hasNext()) await next();
await pick(/C 네트샷/); console.log("B조 코스 미리보기 끝점:", JSON.stringify(await previewEnds())); await shot("Ccourse-B");
await setTier("D조(초급)"); console.log("D조 코스 미리보기 끝점:", JSON.stringify(await previewEnds())); await shot("Ccourse-D");
await pick(/스트레이트/); console.log("D조 C-1 경로 끝점:", JSON.stringify(await pathEnd()), "| 급수 노트:", await tierNote()); await shot("C1s-D");
await setTier("B조"); console.log("B조 C-1 경로 끝점:", JSON.stringify(await pathEnd()), "| 급수 노트:", await tierNote()); await shot("C1s-B");
await setTier("A조"); console.log("A조 C-1 경로 끝점:", JSON.stringify(await pathEnd()), "| 급수 노트:", await tierNote()); await shot("C1s-A");
await next(); console.log("A조 3구 화면 미리보기 끝점(네트샷 코스 포함):", JSON.stringify(await previewEnds())); await shot("C1s-3gu-A");
console.log("version:", await page.locator("#version").textContent());
console.log("page errors:", errors.length ? errors : "none"); await browser.close();
