// v1.2.1 확인: 시작 화면 종목 버튼 '남복/여복'(혼복은 잠금), 헤더 버튼 '남복/여복 · 급수 ▾', 탭 이름에 종목 접두 없음(남복 6개 / 혼복 2개는 설정 강제로 콘솔 확인), 헤더 폭 넘침 없음. 사용: node scripts/shot-v121.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v121"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); console.log("saved", name); };
const sportBtns = () => page.$$eval("#sportRow button", (bs) => bs.map((b) => b.textContent + (b.disabled ? "[disabled]" : "") + (b.classList.contains("on") ? "[on]" : "")));
const tabs = () => page.$$eval(".tab", (bs) => bs.map((b) => b.textContent + (b.classList.contains("on") ? "[on]" : "")));
const header = async () => {
  const txt = await page.locator("#btnSettings").textContent();
  const box = await page.locator("#btnSettings").boundingBox();
  const h1 = await page.locator("header h1").boundingBox();
  const vw = page.viewportSize().width;
  return { txt, btnRight: box.x + box.width, btnH: box.height, h1W: h1.width, vw, overflow: box.x + box.width > vw || box.height > 40 };
};
const tab = async (re) => { await page.locator(".tab", { hasText: re }).click(); await page.waitForTimeout(2600); };

await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
console.log("시작 화면 종목 버튼:", JSON.stringify(await sportBtns()));
await shot("start-empty");
await page.getByRole("button", { name: "남복/여복", exact: true }).click(); await page.getByRole("button", { name: "D조(초급)", exact: true }).click();
console.log("선택 후 종목 버튼:", JSON.stringify(await sportBtns()));
await shot("start-picked");
await page.locator("#btnStart").click(); await page.waitForTimeout(2600);
console.log("헤더 버튼:", JSON.stringify(await header()));
console.log("탭(남복/여복):", JSON.stringify(await tabs()));
console.log("버전:", await page.locator("#version").textContent());
await shot("serve0-tabs");
await tab(/공수 전환 랠리/); console.log("탭 전환 후:", JSON.stringify(await tabs()), "|", await page.locator("#stepTitle").textContent());
await shot("trans0-tabs");
// 급수 A조로 바꿔 헤더 라벨 갱신 확인(가장 긴 급수 이름은 D조(초급)이므로 그것도 위에서 확인됨)
await page.locator("#btnSettings").click(); await page.waitForTimeout(300); await shot("settings-reopen");
await page.getByRole("button", { name: "A조", exact: true }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600);
console.log("헤더 버튼(A조):", JSON.stringify(await header()));
// 혼복 탭 이름: 시작 화면에서 잠금이고 뷰어 상태는 IIFE 안이라, 탭 글이 되는 topic.title(전역 DATA)을 그대로 읽는다(남복 탭 = title 그대로임을 위에서 확인).
const mixedTabs = await page.evaluate(() => DATA.topics.filter((t) => t.sport === "mixed").map((t) => t.title));
console.log("탭(혼복, title):", JSON.stringify(mixedTabs));
const allTabs = [...(await tabs()), ...mixedTabs];
console.log("종목 접두 남은 탭:", JSON.stringify(allTabs.filter((t) => /^(남복|혼복|여복)/.test(t))));
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
