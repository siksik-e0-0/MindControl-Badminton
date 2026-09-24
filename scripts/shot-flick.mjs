// 롱 서브 주제 2개(서브 측·리시브 측)를 아이폰 크기 뷰포트로 찍는다. 사용: node scripts/shot-flick.mjs /tmp/fshots
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const [outDir = "/tmp/fshots"] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"),
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
let n = 0;
const shot = async (name) => { n += 1; const f = join(outDir, `${String(n).padStart(2, "0")}-${name}.png`); await page.screenshot({ path: f }); console.log("saved", f); };
const next = async () => { await page.getByRole("button", { name: "다음" }).click(); await page.waitForTimeout(2000); };
const pick = async (re) => { await page.getByRole("button", { name: re }).click(); await page.waitForTimeout(2200); };
const tab = async (re) => { await page.getByRole("button", { name: re }).click(); await page.waitForTimeout(2200); };

await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html");
await page.waitForTimeout(500);
// v0.6 시작 화면: 종목·급수 고르고 시작
await page.getByRole("button", { name: "남복" }).click();
await page.getByRole("button", { name: "B조" }).click();
await page.locator("#btnStart").click();
await page.waitForTimeout(1500);
await tab(/롱 서브 · 서브 측/);
await shot("fserve-arrow-sbs");
await pick(/F-A 일찍 읽고 스매시/);
await shot("fA1-smash");
await pick(/블록/);
await shot("fA2a-block");
await page.getByRole("button", { name: "처음" }).click();
await page.waitForTimeout(2200);
await pick(/F-C 균형 잃고 클리어/);
await shot("fC1-clear-rebuild-attack");
await next();
await shot("fC2-smash");
await tab(/롱 서브 · 리시브 측/);
await next();
await shot("rflick-arrow-updown");
await pick(/RF-3 균형 잃음/);
await shot("rf3-clear-sbs-arrow");
await page.getByRole("button", { name: "처음" }).click();
await page.waitForTimeout(2200);
await next();
await pick(/RF-1 일찍 읽음/);
await next();
await shot("rf1b-block-hunt");
const tabs = await page.$$eval(".tab", (bs) => bs.map((b) => b.textContent));
console.log("tabs:", tabs);
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
