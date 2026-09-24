// 연속 노드(next/branches) 사이에서 선수가 임계값(m) 넘게 움직이는 곳을 나열한다. 되돌아가는 교대·엉뚱한 선수가 잡는 경우를 눈으로 거르는 용도.
// 사용: node scripts/check-moves.mjs [임계값=2.0] [topicId]
import fs from "node:fs";
import vm from "node:vm";
const [thresholdArg = "2.0", onlyTopic] = process.argv.slice(2);
const threshold = Number(thresholdArg);
const html = fs.readFileSync(new URL("../../mobile/index.html", import.meta.url), "utf8");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf("const SOURCES"), html.indexOf("// 뷰어")) + "\nthis.DATA=DATA;", ctx);
let count = 0;
for (const t of ctx.DATA.topics) {
  if (onlyTopic && t.id !== onlyTopic) continue;
  for (const [id, n] of Object.entries(t.nodes)) {
    const links = [...(n.next ? [n.next] : []), ...(n.branches || []).map((b) => b.to)];
    for (const to of links) {
      const m = t.nodes[to];
      if (!m || !m.pos) continue;
      for (const p of Object.keys(n.pos)) {
        if (!m.pos[p]) continue;
        const d = Math.hypot(n.pos[p][0] - m.pos[p][0], n.pos[p][1] - m.pos[p][1]);
        if (d > threshold) { count += 1; console.log(`${t.id} ${id} -> ${to} ${p} ${d.toFixed(1)}m ${JSON.stringify(n.pos[p])} -> ${JSON.stringify(m.pos[p])}`); }
      }
    }
  }
}
console.log(`임계값 ${threshold}m 초과 이동 ${count}건`);
