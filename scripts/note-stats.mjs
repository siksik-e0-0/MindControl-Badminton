// 노트 종류별 문장 길이 통계(v1.3 간결화 확인용). 사용: node scripts/note-stats.mjs [../mobile/index.html]
// 출력: 종류 | 노드 노트 수 | 고유 문장 수 | 길이 평균·최대 | 60자 초과 수. 괄호 짝이 안 맞거나 두 칸 띄어쓰기가 있는 문장은 문제로 표시.
import { readFileSync } from "node:fs";
import vm from "node:vm";
const file = process.argv[2] || new URL("../../mobile/index.html", import.meta.url).pathname;
const html = readFileSync(file, "utf8");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf("const SOURCES"), html.indexOf("// 뷰어")) + "\nthis.DATA = DATA;", ctx);
const stats = {}, problems = [];
for (const t of ctx.DATA.topics) for (const id in t.nodes) (t.nodes[id].notes || []).forEach((n) => {
  const s = stats[n.kind] = stats[n.kind] || { nodes: 0, uniq: new Map() };
  s.nodes += 1; s.uniq.set(n.text, (s.uniq.get(n.text) || 0) + 1);
  const open = (n.text.match(/\(/g) || []).length, close = (n.text.match(/\)/g) || []).length;
  if (open !== close || /  /.test(n.text) || /\s[.,]/.test(n.text)) problems.push(`${t.id}/${id} [${n.kind}] ${n.text.slice(0, 60)}`);
});
for (const k of Object.keys(stats).sort()) {
  const lens = [...stats[k].uniq.keys()].map((x) => x.length);
  console.log(k.padEnd(4), "노드 노트", String(stats[k].nodes).padStart(4), "| 고유 문장", String(lens.length).padStart(4), "| 길이 평균", Math.round(lens.reduce((a, b) => a + b, 0) / lens.length), "최대", Math.max(...lens), "| 60자 초과", lens.filter((l) => l > 60).length);
}
console.log("형식 문제", problems.length); problems.forEach((p) => console.log(" -", p));
