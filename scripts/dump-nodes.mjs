// 데이터 구간을 vm으로 평가해 지정한 노드를 압축 출력한다. 사용: node dump-nodes.mjs <topicId> <nodeId...>
import fs from "node:fs";
import vm from "node:vm";
const html = fs.readFileSync(new URL("../../mobile/index.html", import.meta.url), "utf8");
const slice = html.slice(html.indexOf("const SOURCES"), html.indexOf("// 뷰어"));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(slice + "\nthis.SOURCES=SOURCES;this.DATA=DATA;", ctx);
const [topicId, ...ids] = process.argv.slice(2);
const topic = ctx.DATA.topics.find((t) => t.id === topicId);
if (!topic) { console.error("no topic " + topicId); process.exit(1); }
const list = ids.length ? ids : Object.keys(topic.nodes);
for (const id of list) {
  const n = topic.nodes[id];
  if (!n) { console.log("== " + id + ": (없음)"); continue; }
  const j = (v) => JSON.stringify(v);
  console.log("== " + id + ": " + n.title);
  if (n.shot) console.log("  shot " + j(n.shot));
  console.log("  pos " + j(n.pos) + " form " + j(n.formation) + (n.arrow ? " arrow " + j(n.arrow) : ""));
  if (n.prompt) console.log("  prompt " + n.prompt);
  if (n.branches) n.branches.forEach((b) => console.log("  -> " + b.to + " [" + b.label + "] w" + b.w + " s" + b.skill));
  if (n.next) console.log("  next " + n.next);
  if (n.end) console.log("  end " + n.end);
  if (n.noProb) console.log("  noProb");
  (n.notes || []).forEach((t) => console.log("  · " + t.kind + " | " + t.text + " | " + (t.src || []).join(",")));
}
