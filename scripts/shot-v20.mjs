// v2.0 확인(5구 자동 재생): 출처🔻 요약, 단식 서브 측·리시브 측 '추천 코스' 자동 재생(3구까지), 다른 주제에서 버튼 숨김, 재생 중 '처음'으로 취소. 사용: node scripts/shot-v20.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v20"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); };
const tab = async (re) => { await page.locator(".tab", { hasText: re }).click(); await page.waitForTimeout(2600); };
const state = async () => ({ title: await page.locator("#stepTitle").textContent(), step: await page.locator("#stepNo").textContent(), note: await page.locator("#autoNote").textContent(), btn: await page.locator("#btnAuto").textContent(), btnHidden: await page.locator("#btnAuto").evaluate((b) => b.classList.contains("hidden")), disabled: await page.locator("#btnAuto").isDisabled() });
// 자동 재생을 끝까지 지켜보며 1.1초마다 장면을 찍는다(최대 40초)
const autoplay = async (tag) => {
  await page.locator("#btnAuto").click();
  const t0 = Date.now(); let last = "";
  while (Date.now() - t0 < 120000) {
    await page.waitForTimeout(1100);
    const st = await state();
    const key = st.title + "|" + (st.note.startsWith("추천 코스 끝") ? "END" : "");
    if (key !== last) { last = key; await shot(tag + "-" + st.step.replace("/", "of")); console.log(`  [${tag}] ${st.step} ${st.title} · 버튼 "${st.btn}" · ${st.note.slice(0, 40)}`); }
    if (st.note.startsWith("추천 코스 끝")) break;
  }
  return state();
};
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "단식", exact: true }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600);
console.log("서브 측 처음:", await state());
await shot("serve-start");
const s1 = await autoplay("serve");
console.log("서브 측 끝:", s1, "history 길이:", await page.evaluate(() => document.querySelectorAll("#branches .branch").length));
// 끝 장면에서 '이전'을 누르면 안내가 지워지는지
await page.getByRole("button", { name: "이전" }).click(); await page.waitForTimeout(1500);
console.log("이전 뒤:", await state());
// 리시브 측
await tab(/숏서브 · 리시브 측/);
console.log("리시브 측 처음:", await state());
const s2 = await autoplay("recv");
console.log("리시브 측 끝:", s2);
// 재생 중 '처음' → 취소되는지(3초 뒤에도 1/…에 머무는지)
await page.locator("#btnAuto").click(); await page.waitForTimeout(3500);
console.log("재생 중:", await state());
await page.getByRole("button", { name: "처음" }).click(); await page.waitForTimeout(4000);
console.log("처음 누른 뒤 4초:", await state());
// 다른 주제: 버튼 숨김
await tab(/클리어·드롭 랠리/); console.log("클리어·드롭:", await state()); await shot("cleardrop-hidden");
// 출처🔻 요약(패널 맨 아래로 스크롤해 찍기)
await page.locator("details.sources summary").scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
console.log("출처 요약 글:", await page.locator("details.sources summary").textContent()); await shot("sources-summary");
await page.locator("details.sources summary").click(); await page.waitForTimeout(300); await shot("sources-open");
console.log("버전:", await page.locator("#version").textContent()); console.log("page errors:", errors.length ? errors : "none");
await browser.close();
