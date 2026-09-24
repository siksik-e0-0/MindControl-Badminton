// v0.9.1 확인: 네트샷 깊이 → 응수 보정. 초구 C-1 스트레이트 네트샷 뒤 3구 선택 화면(C1s_3)을 B/D/C/A조로 찍고
// 갈래 버튼(라벨·%·불가·disabled), 대표 화살표 수, 급수 설명 줄을 콘솔에 찍는다. 덤으로 공수 전환 t3kill(킬/네트샷)의 경로 끝점이 데이터 값(-2.6)인지, 리시브 측 r3_3(상대 응수)도 확인.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v091"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); console.log("saved", name, "|", await page.locator("#stepTitle").textContent()); };
const hasNext = () => page.$$eval("button", (bs) => bs.some((b) => b.textContent.trim() === "다음" && !b.disabled && b.offsetParent !== null));
const next = async () => { await page.getByRole("button", { name: "다음" }).click(); await page.waitForTimeout(2200); };
const pick = async (re) => { await page.getByRole("button", { name: re }).click(); await page.waitForTimeout(2300); };
const buttons = () => page.$$eval("#branches button.branch", (bs) => bs.map((b) => b.querySelector(".lbl").textContent.slice(0, 4) + " " + ((b.querySelector(".pct") || {}).textContent || "-") + (b.disabled ? " [disabled]" : "")));
const arrows = () => page.$$eval("#court line", (ls) => ls.filter((l) => l.getAttribute("stroke-width") === "0.09").length);
const pathEnd = () => page.$$eval("#court line", (ls) => ls.filter((l) => l.getAttribute("stroke") === "#222" && l.getAttribute("stroke-dasharray") === "0.18 0.12").map((l) => [+l.getAttribute("x2"), +l.getAttribute("y2")]));
const tierNote = () => page.$$eval("#notes li", (ls) => ls.filter((l) => l.textContent.startsWith("급수")).map((l) => l.textContent.trim().slice(0, 44)));
const setTier = async (t) => { await page.locator("#btnSettings").click(); await page.waitForTimeout(300); await page.getByRole("button", { name: t, exact: true }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600); };
const tab = async (re) => { await page.locator(".tab", { hasText: re }).click(); await page.waitForTimeout(2600); };
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "남복" }).click(); await page.getByRole("button", { name: "B조" }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600);
while (await hasNext()) await next();
await pick(/C 네트샷/); await pick(/스트레이트/); await next();
for (const t of ["B조", "D조(초급)", "C조", "A조"]) {
  await setTier(t);
  console.log(t, "C1s_3 버튼:", JSON.stringify(await buttons()), "| 대표 화살표:", await arrows(), "| 급수 줄:", JSON.stringify(await tierNote()));
  await shot("C1s_3-" + t.slice(0, 1));
}
// 잠금 버튼 합성 클릭이 무시되는지(A조 킬)
await page.$$eval("#branches button.branch", (bs) => bs[0].dispatchEvent(new MouseEvent("click", { bubbles: true })));
await page.waitForTimeout(800); console.log("A조 킬 강제 클릭 후 제목:", await page.locator("#stepTitle").textContent());
// 리시브 측: 우리 네트샷(중앙) → 상대 S의 3구
await tab(/숏서브 · 리시브 측/); while (await hasNext()) await next();
await pick(/네트샷/); await pick(/중앙/); await next();
console.log("A조 r3_3 버튼:", JSON.stringify(await buttons()), "| 대표 화살표:", await arrows(), "| 급수 줄:", JSON.stringify(await tierNote())); await shot("r3_3-A");
await setTier("D조(초급)"); console.log("D조 r3_3 버튼:", JSON.stringify(await buttons()), "| 대표 화살표:", await arrows());
// 공수 전환: 킬/네트샷(t3kill) 경로 끝점은 데이터 값(-2.6)이어야 함(정규식 오탐 수정)
await tab(/공수 전환/); while (await hasNext()) await next();
await pick(/블록/); console.log("블록 뒤 제목:", await page.locator("#stepTitle").textContent(), "| 경로 끝점:", JSON.stringify(await pathEnd()), "| 급수 줄:", JSON.stringify(await tierNote()));
while (await hasNext()) { await next(); console.log("  다음 →", await page.locator("#stepTitle").textContent(), "| 경로 끝점:", JSON.stringify(await pathEnd()), "| 급수 줄:", JSON.stringify(await tierNote())); }
await shot("t3kill-D");
console.log("version:", await page.locator("#version").textContent());
console.log("page errors:", errors.length ? errors : "none"); await browser.close();
