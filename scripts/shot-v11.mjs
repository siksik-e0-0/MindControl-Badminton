// v1.1 확인: 포핸드/백핸드를 손으로 쓴 기술 선택 12곳(초구 리턴·4구·롱 서브·드라이브 랠리·공수 전환)에 적용한 결과를 급수별로 찍고 버튼(라벨·%·불가)·프롬프트·면 설명 줄을 콘솔에.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const outDir = "/tmp/v11"; mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
let n = 0; const shot = async (name) => { n += 1; await page.screenshot({ path: join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) }); console.log("saved", name, "|", await page.locator("#stepTitle").textContent()); };
const next = async () => { await page.getByRole("button", { name: "다음" }).click(); await page.waitForTimeout(2200); };
const prev = async () => { await page.getByRole("button", { name: "이전" }).click(); await page.waitForTimeout(2200); };
const pick = async (re) => { await page.getByRole("button", { name: re }).click(); await page.waitForTimeout(2300); };
const buttons = () => page.$$eval("#branches button.branch", (bs) => bs.map((b) => b.querySelector(".lbl").textContent.replace(/ — .*?(?= \(|$)/, "").slice(0, 26) + " " + ((b.querySelector(".pct") || {}).textContent || "-") + (b.disabled ? " [disabled]" : "")));
const arrows = () => page.$$eval("#court line", (ls) => ls.filter((l) => l.getAttribute("stroke-width") === "0.09").length);
const prompt = () => page.locator("#branches .prompt").textContent();
const sideNote = () => page.$$eval("#notes li", (ls) => ls.filter((l) => l.textContent.startsWith("면")).map((l) => l.textContent.trim().slice(0, 80)));
const title = () => page.locator("#stepTitle").textContent();
const setTier = async (t) => { await page.locator("#btnSettings").click(); await page.waitForTimeout(300); await page.getByRole("button", { name: t, exact: true }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600); };
const tab = async (re) => { await page.locator(".tab", { hasText: re }).click(); await page.waitForTimeout(2600); };
const log = async (tag) => console.log(tag, "|", await title(), "|", JSON.stringify(await buttons()), "| 화살표", await arrows(), "| prompt:", await prompt(), "| 면:", JSON.stringify(await sideNote()));
await page.goto("file:///home/fgcp/personal/badmin-simulater/mobile/index.html"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "남복" }).click(); await page.getByRole("button", { name: "D조(초급)" }).click(); await page.locator("#btnStart").click(); await page.waitForTimeout(2600);
// 1) 서브 측 초구: 리시버 R 백핸드(몸 쪽)
await next(); await log("D조 reply"); await shot("reply-D");
await setTier("A조"); await log("A조 reply"); await shot("reply-A");
// 2) 리시브 측 초구: R 백핸드
await setTier("D조(초급)"); await tab(/숏서브 · 리시브 측/); await next(); await next(); await log("D조 choice"); await shot("choice-D");
await setTier("A조"); await log("A조 choice");
// 3) 롱 서브 서브 측: fserve(R 포핸드 오버헤드, 제한 없음) → F-A 스매시 → fA1(P 백핸드 몸 쪽)
await tab(/롱 서브 · 서브 측/); await log("A조 fserve"); await setTier("D조(초급)"); await log("D조 fserve"); await shot("fserve-D");
await pick(/F-A/); await log("D조 fA1"); await shot("fA1-D"); await setTier("A조"); await log("A조 fA1");
// 4) 롱 서브 리시브 측: rflick(R 포핸드)
await tab(/롱 서브 · 리시브 측/); await next(); await log("A조 rflick");
// 5) 드라이브 랠리: dr2f / dr2low (F 백핸드 몸 쪽)
await tab(/드라이브 랠리/); await next(); await pick(/가 F가/); await log("A조 dr2f"); await setTier("D조(초급)"); await log("D조 dr2f"); await shot("dr2f-D");
await prev(); await pick(/다 네트 아래로/); await log("D조 dr2low"); await shot("dr2low-D");
// 6) 공수 전환: t1(O1 백핸드 왼쪽) → 드라이브 카운터(A조) → t2drive(B 포핸드) → 리프트 → t4smash(B 백핸드 몸 쪽)
await tab(/공수 전환/); await next(); await log("D조 t1"); await shot("t1-D");
const before = await title(); await page.$eval("#branches button.branch:nth-child(3)", (b) => b.click()).catch(() => {}); await page.evaluate(() => { const b = [...document.querySelectorAll("#branches button.branch")].find((x) => /드라이브 카운터/.test(x.textContent)); if (b) b.click(); }); await page.waitForTimeout(800);
console.log("D조 t1 잠금 갈래 강제 클릭 → 화면 유지:", (await title()) === before);
await setTier("A조"); await log("A조 t1"); await pick(/나 드라이브 카운터/); await log("A조 t2drive"); await pick(/늦어 네트 아래/); await next(); await log("A조 t4smash");
await setTier("D조(초급)"); await log("D조 t4smash"); await shot("t4smash-D");
// 7) 4구: D 리프트 → P 스매시 센터 → 상대 수비(코스 면 라벨) → 깊은 리프트 → D3b(P 포핸드) / 짧은 리프트 → D3c
await setTier("A조"); await tab(/숏서브 · 서브 측/); await next(); await pick(/D 리프트/); await next(); await pick(/^스매시/); await pick(/센터/); await log("A조 D1_3_smash_s_centre");
await pick(/깊은 리프트/); await log("A조 D3b"); await shot("D3b-A"); await prev(); await pick(/짧은 리프트/); await log("A조 D3c");
console.log("version:", await page.locator("#version").textContent());
console.log("page errors:", errors.length ? errors : "none"); await browser.close();
