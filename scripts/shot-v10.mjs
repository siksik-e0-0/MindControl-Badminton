// v1.0 확인: 포핸드/백핸드 상황 보정. 초구 2-2 후위 쪽 드라이브 → P의 3구(B1p_3, 백핸드)를 급수별로 찍고 버튼(라벨·%·불가)·면 설명 줄을 콘솔에.
// 덤으로 코스 선택의 "(P 백핸드)" 라벨과 급수별 %, D 리프트 → P의 3구(D1_3, 백핸드 오버헤드), 리시브 측 r2p_3(상대 P 백핸드), 4구 수비 갈래(스매시 센터 뒤)도 확인.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v10"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); console.log("saved", name, "|", await page.locator("#stepTitle").textContent()); };
const hasNext = () => page.$$eval("button", (bs) => bs.some((b) => b.textContent.trim() === "다음" && !b.disabled && b.offsetParent !== null));
const next = async () => { await page.getByRole("button", { name: "다음" }).click(); await page.waitForTimeout(2200); };
const pick = async (re) => { await page.getByRole("button", { name: re }).click(); await page.waitForTimeout(2300); };
const buttons = () => page.$$eval("#branches button.branch", (bs) => bs.map((b) => b.querySelector(".lbl").textContent.replace(/ — .*?(?= \(|$)/, "").slice(0, 22) + " " + ((b.querySelector(".pct") || {}).textContent || "-") + (b.disabled ? " [disabled]" : "")));
const arrows = () => page.$$eval("#court line", (ls) => ls.filter((l) => l.getAttribute("stroke-width") === "0.09").length);
const prompt = () => page.locator("#branches .prompt").textContent();
const sideNote = () => page.$$eval("#notes li", (ls) => ls.filter((l) => l.textContent.startsWith("면")).map((l) => l.textContent.trim().slice(0, 70)));
const setTier = async (t) => { await page.locator("#btnSettings").click(); await page.waitForTimeout(300); await page.getByRole("button", { name: t, exact: true }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600); };
const tab = async (re) => { await page.locator(".tab", { hasText: re }).click(); await page.waitForTimeout(2600); };
const first = async () => { await page.getByRole("button", { name: "처음" }).click(); await page.waitForTimeout(2600); };
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "남복" }).click(); await page.getByRole("button", { name: "B조" }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600);
// 1) 초구 2-2 후위 쪽 드라이브 → P 3구 (백핸드)
while (await hasNext()) await next();
await pick(/B 드라이브/); await pick(/후위/); await next();
for (const t of ["B조", "D조(초급)", "C조", "A조"]) {
  await setTier(t);
  console.log(t, "B1p_3:", JSON.stringify(await buttons()), "| 화살표", await arrows(), "| prompt:", await prompt());
  if (t === "D조(초급)" || t === "A조") await shot("B1p_3-" + t.slice(0, 1));
}
console.log("면 줄:", JSON.stringify(await sideNote()));
// 2) 코스 선택: 푸시 코스에 "(… 백핸드)" 라벨과 급수별 %
await pick(/^푸시/);
console.log("A조 B1p_3_push:", JSON.stringify(await buttons()));
await setTier("D조(초급)"); console.log("D조 B1p_3_push:", JSON.stringify(await buttons())); await shot("B1p_3_push-D");
// 3) D 리프트 → P 3구 (백핸드 오버헤드)
await first(); while (await hasNext()) await next();
await pick(/D 리프트/); await next();
console.log("D조 D1_3:", JSON.stringify(await buttons()), "| prompt:", await prompt(), "| 면 줄:", JSON.stringify(await sideNote())); await shot("D1_3-D");
await setTier("A조"); console.log("A조 D1_3:", JSON.stringify(await buttons()));
// 4) 4구: 스매시 센터 뒤 상대 수비 갈래(받는 상대의 면)
await pick(/^스매시/); await pick(/센터/);
console.log("A조 D1_3_smash_s_centre:", JSON.stringify(await buttons()), "| prompt:", await prompt(), "| 면 줄:", JSON.stringify(await sideNote()));
await setTier("D조(초급)"); console.log("D조 D1_3_smash_s_centre:", JSON.stringify(await buttons())); await shot("D1_3_smash_centre-D");
// 5) 리시브 측: 상대 P 백핸드 (r2p_3)
await tab(/숏서브 · 리시브 측/); while (await hasNext()) await next();
await pick(/드라이브 — 서브/); await pick(/후위/); await next();
console.log("D조 r2p_3:", JSON.stringify(await buttons()), "| prompt:", await prompt(), "| 면 줄:", JSON.stringify(await sideNote())); await shot("r2p_3-D");
// 6) 포핸드 예: A-2 크로스 푸시 → P 3구 (A1x_3) — 제한 없음
await first(); while (await hasNext()) await next();
await tab(/숏서브 · 서브 측/); while (await hasNext()) await next();
await pick(/A 푸시/); await pick(/크로스/); await next();
console.log("D조 A1x_3(포핸드):", JSON.stringify(await buttons()), "| prompt:", await prompt(), "| 면 줄:", JSON.stringify(await sideNote())); await shot("A1x_3-D");
console.log("version:", await page.locator("#version").textContent());
console.log("page errors:", errors.length ? errors : "none"); await browser.close();
