// 기술 배우기 화면 궤적 검사 — 빌드된 mobile/index.html의 TECHS와 techCurve를 그대로 읽어
// 셔틀이 네트를 뚫지 않는지, 모양이 자연스러운지(정점 위치·평평한 구간·진행 방향)를 전수로 본다.
// 올려 보내는 타구는 네트 통과 높이가 데이터가 아니라 결과라, 이 검사가 관통을 막는 장치다.
import fs from "fs"; import vm from "vm";
const file = process.argv[2] || "mobile/index.html";
const html = fs.readFileSync(file, "utf8");
const ti = html.indexOf("const TECHS = [");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.slice(ti, html.indexOf("  ];", ti) + 4) + "\nglobalThis.TECHS = TECHS;", ctx);
// techCurve / bez / techAt 를 빌드 산출물에서 그대로 떼어 쓴다(검사가 화면과 같은 식을 보게).
const ci = html.indexOf("  const NET_SLOPE");
const fnSrc = html.slice(ci, html.indexOf("  // 전체 진행도", ci));
const atSrc = html.slice(html.indexOf("  function techAt(cv, u) {"), html.indexOf("  // 옆에서 본 단면"));
vm.runInContext(fnSrc + atSrc + "\nglobalThis.techCurve = techCurve; globalThis.techAt = techAt;", ctx);
const { TECHS, techCurve, techAt } = ctx;
const NET_H = 1.524;
function techOf(b, vi) { if (vi < 0 || !b.vars[vi]) return b; const v = b.vars[vi]; return Object.assign({}, b, v, { name: v.name }); }
const rows = []; for (const b of TECHS) { rows.push(b); b.vars.forEach((_, i) => rows.push(techOf(b, i))); }
let bad = 0, minMargin = 99, worst = "";
for (const t of rows) {
  const cv = techCurve(t);
  let prevX = -1e9, hNet = null, apexY = 1e9, apexX = 0;
  for (let i = 0; i <= 800; i++) {
    const u = i / 800, p = techAt(cv, u);
    if (p[0] < prevX - 1e-9) { console.log(`문제 ${t.name}: 진행 방향이 뒤로 감 (u=${u.toFixed(3)})`); bad++; }
    prevX = p[0];
    if (hNet === null && p[0] >= 0) hNet = -p[1];
    if (p[1] < apexY) { apexY = p[1]; apexX = p[0]; }
  }
  const margin = hNet - NET_H;
  if (margin < 0) { console.log(`문제 ${t.name}: 네트 관통 — 통과 높이 ${hNet.toFixed(2)}m < ${NET_H}m`); bad++; }
  if (margin < minMargin) { minMargin = margin; worst = t.name; }
  // 네트 근처에서 수평으로 눕지 않는지(내려치는 타구)
  if (!t.apex) {
    const e = 1e-4, a1 = techAt(cv, cv.split - e), a2 = techAt(cv, cv.split + e);
    const k1 = (cv.mid[1] - a1[1]) / (cv.mid[0] - a1[0]), k2 = (a2[1] - cv.mid[1]) / (a2[0] - cv.mid[0]);
    if (Math.abs(k1) < 0.05 && Math.abs(k2) < 0.05) { console.log(`문제 ${t.name}: 네트에서 궤적이 평평함`); bad++; }
    if (Math.abs(apexX - t.from[0]) > 1e-6) { console.log(`문제 ${t.name}: 내려치는 타구인데 타점 뒤에 정점이 생김`); bad++; }
  } else {
    const span = t.to[0] - t.from[0], pct = (apexX - t.from[0]) / span * 100;
    if (pct < 20 || pct > 90) { console.log(`문제 ${t.name}: 정점 위치 ${pct.toFixed(0)}% (20~90% 밖)`); bad++; }
    if (-apexY < t.apex[1] - 1e-6) { console.log(`문제 ${t.name}: 정점 높이가 데이터와 다름`); bad++; }
  }
}
console.log(`궤적 검사: 기술 ${rows.length}종(변형 포함), 최소 네트 여유 ${minMargin.toFixed(2)}m(${worst}), 문제 ${bad}`);
process.exit(bad ? 1 : 0);
