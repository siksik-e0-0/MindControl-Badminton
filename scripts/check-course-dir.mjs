// 단식 데이터: 제목·라벨에 '스트레이트/직선/크로스'가 있는 샷(나·상대 모두)의 착지 x 부호가 타자 위치와 맞는지. 사용: node scripts/check-course-dir.mjs
// v1.8.1: 리뷰어 지적(상대 응수 '리프트 크로스'가 같은 쪽 직선) — 이전 검사는 내 샷만 봤다.
import fs from "node:fs";
import vm from "node:vm";
const file = new URL("../../mobile/index.html", import.meta.url).pathname;
const html = fs.readFileSync(file, "utf8");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf("const SOURCES"), html.indexOf("// 뷰어")) + "\nthis.DATA = DATA;", ctx);
let checked = 0; const bad = [];
for (const t of ctx.DATA.topics.filter((t) => t.sport === "singles")) {
  for (const id of Object.keys(t.nodes)) {
    const n = t.nodes[id];
    if (!n.shot) continue;
    const title = n.title.replace(/\([^)]*\)/g, ""); // 괄호 안 조건문("내 크로스가 짧을 때")은 코스 주장이 아님
    const saysStraight = /스트레이트|직선/.test(title) && !/블록 \(|엔 스트레이트/.test(title);
    const saysCross = /크로스/.test(title) && !/크로스 스매시엔|엔 크로스/.test(title);
    if (!saysStraight && !saysCross) continue;
    // '블록' 장면은 제목이 코스 규칙을 인용("직선 스매시 뒤 크로스 블록")하므로 마지막 코스 단어로 판단
    let claim = null;
    if (/블록/.test(title)) { const m = title.match(/(스트레이트|크로스)[^→]*$/); claim = m ? (m[1] === "크로스" ? "cr" : "st") : null; }
    else claim = saysCross && !saysStraight ? "cr" : saysStraight && !saysCross ? "st" : (title.lastIndexOf("크로스") > title.lastIndexOf("스트레이트") ? "cr" : "st");
    if (!claim) continue;
    const fx = n.shot.from[0], tx = n.shot.to[0];
    if (Math.abs(fx) < 0.3 || Math.abs(tx) < 0.5) continue; // 중앙에서/중앙으로는 방향 판정 안 함
    checked += 1;
    const isStraight = Math.sign(fx) === Math.sign(tx);
    if ((claim === "st") !== isStraight) bad.push(`${t.id}/${id}: "${title}" ${n.shot.by} [${fx},${n.shot.from[1]}]→[${tx},${n.shot.to[1]}] (${isStraight ? "같은 쪽" : "반대 쪽"})`);
  }
}
console.log(`단식 방향 검사: ${checked}건 확인, 불일치 ${bad.length}`);
bad.forEach((b) => console.log(" -", b));
process.exit(bad.length ? 1 : 0);
