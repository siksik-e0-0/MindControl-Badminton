// 실제 브라우저 렌더링 확인용. 캐시된 chromium 실행파일로 화면을 밟아가며 스크린샷을 찍는다.
// 사용: node scripts/screenshot.mjs http://localhost:4173 /tmp/shots
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const [url = "http://localhost:4173", outDir = "/tmp/shots"] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const executablePath = join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome");
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

let n = 0;
const shot = async (name) => {
  n += 1;
  const file = join(outDir, `${String(n).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("saved", file);
};

// 코트 캔버스 좌표 → 클릭 위치(캔버스 기준 px). CourtScene: margin 40, 폭 300px = 6.1m, 높이 659px = 13.4m
const scale = 300 / 6.1;
const toPx = (x, y) => ({ x: 40 + 150 + x * scale, y: 40 + 659 / 2 + y * scale });

await page.goto(url, { waitUntil: "networkidle" });
await page.getByText("배드민턴 복식 시뮬레이터").waitFor();
await shot("setup");

await page.getByRole("button", { name: "남복" }).click();
await page.getByRole("button", { name: "초심" }).click();
await page.getByRole("button", { name: "시작" }).click();
const canvas = page.locator("canvas");
await canvas.waitFor();
await page.waitForTimeout(1200); // Phaser 씬 create 대기
await shot("serve-select");

await page.getByRole("button", { name: "숏서브" }).click();
await page.waitForTimeout(400);
await shot("serve-aim-zone");

// 서브 목표 x: HUD가 "우측 코트"면 AI의 우측 박스(화면 오른쪽, x>0), "좌측 코트"면 왼쪽(x<0)
const serveTargetX = async () => (/좌측 코트/.test(await page.locator(".hud").innerText()) ? -1.5 : 1.5);
// 플레이어 점수 0(짝수) → 우측 서비스코트에서 서브 → 목표는 AI의 우측 박스(화면 오른쪽 아래, x>0, y 1.98~5.94)
let p = toPx(await serveTargetX(), 3.5);
await canvas.click({ position: p });
await page.getByText("목표(미확정)").waitFor({ timeout: 5000 });
// 재조정(A안): 한 번 더 다른 곳을 터치하면 마커가 옮겨져야 한다
p = toPx((await serveTargetX()) * 0.55, 4.5);
await canvas.click({ position: p });
await page.waitForTimeout(200);
await shot("serve-marker-readjusted");

await page.getByRole("button", { name: "확정" }).click();
// 서브 재생 → AI 리턴 재생 → 플레이어 턴 또는 랠리 종료
await page.waitForFunction(
  () => /기술 카드를 고르세요|득점|실점/.test(document.body.innerText),
  null,
  { timeout: 20000 },
);
await page.waitForTimeout(300);
await shot("after-serve-exchange");

// 랠리가 끝날 때까지 플레이어 턴을 밟는다. 로테이션 신호가 뜨면 버튼을 눌러 실행하고 그 전후를 찍는다.
let rotationShot = false;
let aimShot = false;
const playRally = async () => {
  for (let i = 0; i < 16; i++) {
    const text = await page.evaluate(() => document.body.innerText);
    if (/득점|실점/.test(text) && /다음 랠리/.test(text)) return;
    if (/매치 결과/.test(text)) return;
    if (/기술 카드를 고르세요/.test(text)) {
      const rotateBtn = page.locator(".formation-bar .btn-rotate");
      const cls = (await rotateBtn.count()) > 0 ? await rotateBtn.getAttribute("class") : "";
      if (/recommended|urgent/.test(cls ?? "")) {
        if (!rotationShot) await shot("rotation-signal");
        await rotateBtn.click();
        await page.waitForTimeout(300);
        const after = await rotateBtn.getAttribute("class");
        if (/recommended|urgent/.test(after ?? "")) throw new Error("로테이션 실행 후에도 신호 강조가 남음");
        if (!rotationShot) await shot("rotation-applied");
        rotationShot = true;
      }
      const cards = page.locator(".card-row .card:not([disabled])");
      const recommended = page.locator(".card-row .card.recommended:not([disabled])");
      if ((await recommended.count()) > 0) await recommended.first().click();
      else await cards.first().click();
      await page.waitForTimeout(300);
      if (!aimShot) await shot("player-aim-zone");
      await canvas.click({ position: toPx(-1.2, 4.0) });
      await page.getByText("목표(미확정)").waitFor({ timeout: 5000 });
      if (!aimShot) {
        await shot("player-marker");
        aimShot = true;
      }
      await page.getByRole("button", { name: "확정" }).click();
      await page.waitForFunction(
        () => /기술 카드를 고르세요|다음 랠리|매치 결과/.test(document.body.innerText),
        null,
        { timeout: 20000 },
      );
      await page.waitForTimeout(300);
    } else {
      await page.waitForTimeout(500);
    }
  }
};
await playRally();
await shot("rally-end");

await page.getByRole("button", { name: "상세보기" }).click();
await page.getByText("랠리 리플레이").waitFor();
await shot("rally-report");
await page.getByRole("button", { name: "닫기" }).click();

await page.getByRole("button", { name: "다음 랠리" }).click();
await page.waitForTimeout(1500);
await shot("next-rally-start");

// 플레이어 조준/로테이션 장면을 아직 못 찍었으면 찍을 때까지 랠리를 더 돌린다(최대 10랠리)
for (let r = 0; r < 10 && !(rotationShot && aimShot); r++) {
  const text = await page.evaluate(() => document.body.innerText);
  if (/서브 종류를 고르세요/.test(text)) {
    await page.getByRole("button", { name: "숏서브" }).click();
    await page.waitForTimeout(200);
    await canvas.click({ position: toPx(await serveTargetX(), 3.5) });
    await page.getByText("목표(미확정)").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "확정" }).click();
    await page.waitForFunction(() => /기술 카드를 고르세요|다음 랠리|매치 결과/.test(document.body.innerText), null, { timeout: 20000 });
    await page.waitForTimeout(300);
  }
  await playRally();
  const t2 = await page.evaluate(() => document.body.innerText);
  if (/매치 결과/.test(t2)) break;
  await page.getByRole("button", { name: "다음 랠리" }).click();
  await page.waitForTimeout(1500);
}
console.log("aim captured:", aimShot, "rotation captured:", rotationShot);

const hud = await page.locator(".hud").innerText();
console.log("HUD:", hud.replace(/\n/g, " | "));
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
