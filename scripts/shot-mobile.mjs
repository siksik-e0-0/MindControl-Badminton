// 단일 HTML 모바일 뷰어를 아이폰 크기 뷰포트로 열어 스크린샷. 사용: node scripts/shot-mobile.mjs /tmp/mshots
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const [outDir = "/tmp/mshots"] = process.argv.slice(2);
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
await page.getByRole("button", { name: "남복" }).click();
await page.getByRole("button", { name: "B조" }).click();
await page.locator("#btnStart").click();
await page.waitForTimeout(2200);
await shot("serve");
await next();
await shot("reply-branches");
await pick(/D 리프트/);
await shot("D1-lift-them-sbs");
await next();
await shot("D2-smash-3branches");
await pick(/D-2 상대 깊은 리프트/);
await pick(/D-2b 빠른 드롭/);
await shot("D4b2-fast-drop-no-rotation");
await page.getByRole("button", { name: "이전" }).click();
await page.waitForTimeout(2000);
await page.getByRole("button", { name: "이전" }).click();
await page.waitForTimeout(2000);
await pick(/D-3 상대 짧은 리프트/);
await shot("D3c-short-lift");
await pick(/D-3b 소프트 드롭/);
await shot("D4c2-follow-in-rotation-arrow");
// 출처 목록 펼쳐서 확인
await page.locator("details.sources summary").click();
await page.waitForTimeout(300);
await page.locator("details.sources").scrollIntoViewIfNeeded();
await shot("sources-list");
await page.getByRole("button", { name: /숏서브 · 리시브 측/ }).click();
await page.waitForTimeout(1500);
await next();
await next();
await shot("receive-choice");
await pick(/^4 리프트/);
await shot("r4-lift-us-sbs-arrow");
await next();
await shot("r4b-smash-3branches");
await pick(/드라이브 카운터/);
await shot("r4c3-drive-counter");
// 링크 배지 검사: 첫 화면의 출처 링크 수와 href
await page.getByRole("button", { name: "처음" }).click();
await page.waitForTimeout(2200);
const links = await page.$$eval("ul.notes a.src-url", (as) => as.map((a) => a.getAttribute("href")));
console.log("serve node source links:", links.length, links);
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
