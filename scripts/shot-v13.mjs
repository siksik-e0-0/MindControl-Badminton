// v1.3 확인: 기본·면·조건·상황 설명 줄이 짧아졌는지 — 서브 측(0·초구 응수·3구·3구 잎), 리시브 측 초구, 롱 서브, 드라이브, 공수 전환 화면의 노트 글과 길이. 사용: node scripts/shot-v13.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v13"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); };
const next = async () => { await page.getByRole("button", { name: "다음" }).click(); await page.waitForTimeout(2200); };
const pick = async (re) => { await page.getByRole("button", { name: re }).click(); await page.waitForTimeout(2300); };
const tab = async (re) => { await page.locator(".tab", { hasText: re }).click(); await page.waitForTimeout(2600); };
const KINDS = new Set(["기본", "면", "조건", "상황"]);
const notes = () => page.$$eval("#notes li", (ls) => ls.map((l) => { const k = l.querySelector(".kind, .k, b, strong"); const kind = k ? k.textContent.trim() : "?"; const txt = l.textContent.trim().replace(/\s+/g, " "); return { kind, txt }; }));
let over = [];
const log = async (tag) => {
  const ns = await notes();
  const title = await page.locator("#stepTitle").textContent();
  console.log("==", tag, "|", title);
  for (const x of ns) {
    const body = x.txt.replace(/^\S+\s/, "").replace(/\s(브리프|BB [^ ]+|BH [^ ]+|BI [^ ]+|SL [^ ]+|TeachPE|BF [^ ]+|BWF[^ ]*|추정|확인)(\s|$).*$/, "");
    console.log("  ", x.kind.padEnd(4), String(body.length).padStart(3), body.slice(0, 70));
    if (KINDS.has(x.kind) && body.length > 60) over.push(tag + ": " + body);
  }
};
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "남복/여복", exact: true }).click(); await page.getByRole("button", { name: "D조(초급)", exact: true }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600);
await log("서브 0"); await shot("serve0");
await next(); await log("초구 응수(면·기본·조건)"); await shot("serve-reply");
await pick(/^A 푸시/); await pick(/A-2 크로스/); await next(); await log("3구 선택(면·상황)"); await shot("serve-third");
await pick(/푸시/); await pick(/뒤 코너|스트레이트/); await log("3구 잎(템플릿 조건·기본)"); await shot("serve-third-leaf");
await tab(/숏서브 · 리시브 측/); await log("리시브 0"); await next(); await next(); await log("리시브 초구 선택"); await shot("recv-choice");
await tab(/롱 서브 · 서브 측/); await log("롱 서브 0"); await shot("flick0");
await tab(/드라이브 랠리/); await log("드라이브 0"); await next(); await pick(/내가 앞에서/); await log("드라이브 dr2f(면)"); await shot("drive-dr2f");
await tab(/공수 전환/); await log("공수 전환 0"); await next(); await log("t1(확 상황·면)"); await shot("trans-t1");
await pick(/나 드라이브 카운터/); await pick(/늦어 네트 아래/); await next(); await log("t4smash"); await shot("trans-t4smash");
console.log("버전:", await page.locator("#version").textContent());
console.log("60자 초과(네 종류):", over.length ? over : "없음");
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
