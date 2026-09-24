// v0.8.1 확인: 시작 화면 혼복 버튼 비활성, 다음 버튼 자리 안내 '선택'. 사용: node scripts/shot-v081.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v081"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); console.log("saved", name, "|", await page.locator("#stepTitle").textContent()); };
const hasNext = () => page.$$eval("button", (bs) => bs.some((b) => b.textContent.trim() === "다음" && !b.disabled && b.offsetParent !== null));
const next = async () => { await page.getByRole("button", { name: "다음" }).click(); await page.waitForTimeout(2200); };
const sportBtns = () => page.$$eval("#sportRow button", (bs) => bs.map((b) => ({ text: b.textContent.trim(), disabled: b.disabled, on: b.classList.contains("on") })));
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
console.log("sport buttons (초기):", JSON.stringify(await sportBtns()));
await page.locator("#sportRow button:nth-child(2)").dispatchEvent("click"); // 비활성 버튼에 클릭 이벤트를 강제로 보내도 선택되지 않아야 함
console.log("혼복 강제 클릭 후:", JSON.stringify(await sportBtns()), "| start disabled:", await page.locator("#btnStart").isDisabled());
await page.getByRole("button", { name: "남복" }).click(); await page.getByRole("button", { name: "B조" }).click(); await shot("start-mixed-locked");
await page.locator("#btnStart").click(); await page.waitForTimeout(2000);
while (await hasNext()) await next();
console.log("nav buttons:", await page.$$eval("footer button", (bs) => bs.map((b) => b.textContent.trim() + (b.disabled ? "(비활성)" : ""))));
await shot("branch-screen-select");
await page.locator("#btnSettings").click(); await page.waitForTimeout(300);
console.log("설정 재오픈 sport buttons:", JSON.stringify(await sportBtns()));
await shot("settings-reopen");
const body = await page.evaluate(() => document.body.innerText);
console.log("body has 갈래 선택:", body.includes("갈래 선택"), "| version:", (body.match(/초안 v0\.8\.1[^\n]*/) || ["(없음)"])[0]);
console.log("page errors:", errors.length ? errors : "none"); await browser.close();
