// 추천 코스(v1.9, v2.0) 검사: 단식 서브 측·리시브 측 주제의 recommended(빌드 때 SGL.likelyPath로 계산)가
// (1) 시작에서 이어진 경로이고(next 또는 갈래), (2) rec.shots(=5)번째 샷 장면('N구:')에서 끝나며, (3) 그 샷 수에 닿는 모든 경로 중 갈래 비중 곱이 최대인지 독립 계산으로 확인.
// 동률(1·2위 곱이 같음)은 문제로 치지 않고 알린다. 다른 주제에는 recommended가 없어야 한다.
// 사용: node scripts/check-recommended.mjs [../mobile/index.html]
import { readFileSync } from "node:fs";
import vm from "node:vm";
const file = process.argv[2] || new URL("../../mobile/index.html", import.meta.url).pathname;
const html = readFileSync(file, "utf8");
const s = html.indexOf("const SOURCES"), e = html.indexOf("// 뷰어");
if (s < 0 || e < 0) throw new Error("데이터 구간을 못 찾음");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.slice(s, e) + "\nthis.DATA = DATA;", ctx);
const WANT = ["singles-high-serve", "singles-low-serve-receive"];
const problems = [], notes = [];
for (const t of ctx.DATA.topics) {
  const rec = t.recommended;
  if (!WANT.includes(t.id)) { if (rec) problems.push(`${t.id}: recommended가 있으면 안 됨`); continue; }
  if (!rec || !Array.isArray(rec.ids) || !(rec.share > 0) || !(rec.shots > 0)) { problems.push(`${t.id}: recommended 없음/이상`); continue; }
  const goalRe = new RegExp("^" + rec.shots + "구:");
  const N = t.nodes;
  if (rec.ids[0] !== t.start) problems.push(`${t.id}: 시작이 ${rec.ids[0]} (start ${t.start})`);
  for (let i = 1; i < rec.ids.length; i++) {
    const a = N[rec.ids[i - 1]], b = rec.ids[i];
    if (!a || !N[b]) { problems.push(`${t.id}: ${rec.ids[i - 1]}→${b} 노드 없음`); continue; }
    if (a.next !== b && !(a.branches || []).some((x) => x.to === b)) problems.push(`${t.id}: ${rec.ids[i - 1]}→${b} 이어지지 않음`);
  }
  const last = N[rec.ids[rec.ids.length - 1]];
  if (!last || !goalRe.test(last.title) || last.next || last.branches) problems.push(`${t.id}: 마지막 장면이 ${rec.shots}구 끝 장면이 아님 — ${last && last.title}`);
  const shotCount = rec.ids.filter((id) => N[id] && N[id].shot).length;
  if (shotCount !== rec.shots) problems.push(`${t.id}: 경로의 샷 수 ${shotCount} ≠ rec.shots ${rec.shots}`);
  // 독립 계산: rec.shots번째 샷 장면에 닿는 모든 경로의 비중 곱(샷 수는 제목이 아니라 shot 유무로 센다)
  const all = [];
  const walk = (id, p, ids, k) => {
    const n = N[id], kk = k + (n.shot ? 1 : 0);
    if (n.next) return walk(n.next, p, ids.concat(n.next), kk);
    if (!n.branches) { if (kk === rec.shots) { all.push({ p, ids }); if (!goalRe.test(n.title)) problems.push(`${t.id}/${id}: ${rec.shots}번째 샷인데 제목이 '${rec.shots}구:'가 아님 — ${n.title}`); } return; }
    const sum = n.branches.reduce((a, b) => a + (b.w || 1), 0);
    n.branches.forEach((b) => walk(b.to, p * (b.w || 1) / sum, ids.concat(b.to), kk));
  };
  walk(t.start, 1, [t.start], 0);
  all.sort((a, b) => b.p - a.p);
  if (!all.length) { problems.push(`${t.id}: ${rec.shots}구 장면에 닿는 경로 없음`); continue; }
  if (Math.abs(all[0].p - rec.share) > 1e-12) problems.push(`${t.id}: 저장된 곱 ${rec.share} ≠ 최대 ${all[0].p}`);
  const tied = all.filter((x) => Math.abs(x.p - all[0].p) < 1e-12);
  if (!tied.some((x) => x.ids.join(">") === rec.ids.join(">"))) problems.push(`${t.id}: 저장된 경로가 최대 경로가 아님`);
  if (tied.length > 1 && tied[0].ids.join(">") !== rec.ids.join(">")) problems.push(`${t.id}: 동률인데 먼저 적힌 갈래가 아님`);
  notes.push(`${t.id}: ${rec.shots}구 경로 ${all.length}개, 최대 곱 ${(all[0].p * 100).toFixed(2)}%${tied.length > 1 ? " (동률 " + tied.length + "개 — 먼저 적힌 갈래 채택: " + tied.map((x) => N[x.ids[x.ids.length - 1]].title).join(" | ") + ")" : ""}`);
  notes.push("  " + rec.ids.map((id) => id + " [" + N[id].title + "]").join("\n  "));
}
notes.forEach((n) => console.log(n));
console.log(`추천 코스 검사: 주제 ${WANT.length}, 문제 ${problems.length}`);
problems.forEach((p) => console.log(" -", p));
process.exit(problems.length ? 1 : 0);
