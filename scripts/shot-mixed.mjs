// 혼복 주제 2개를 아이폰 크기 뷰포트로 찍는다. 사용: node scripts/shot-mixed.mjs /tmp/xshots
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const [outDir = "/tmp/xshots"] = process.argv.slice(2);
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

await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html");
await page.waitForTimeout(500);
// v0.6 시작 화면: 종목·급수 고르고 시작
await page.getByRole("button", { name: "혼복" }).click();
await page.getByRole("button", { name: "B조" }).click();
await page.locator("#btnStart").click();
await page.waitForTimeout(2500);
await pick(/숏서브 · 서브 측/);
await shot("mstart-who-serves");
await pick(/남자\(M\) 서브/);
await shot("mm-serve");
await pick(/리프트 → 남자 공격/);
await shot("m-lift");
await next();
await shot("m-smash");
await pick(/숏\/롱 서브 · 리시브 측/);
await shot("rstart-rule");
await pick(/여자\(W\) 리시브/);
await pick(/롱 서브 → 여자 본인이/);
await shot("rw-flickIn-arrow");
await next();
await shot("rw-flick-attack-reset");
await page.getByRole("button", { name: "처음" }).click();
await page.waitForTimeout(2200);
await pick(/남자\(M\) 리시브/);
await pick(/숏서브 → 리턴 후 남자 뒤로/);
await shot("rm-low-swap-arrow");
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
