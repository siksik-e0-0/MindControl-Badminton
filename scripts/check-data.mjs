// mobile/index.html 안 시나리오 데이터 무결성 검사.
// 사용: node scripts/check-data.mjs [../mobile/index.html]
// 검사: 미정의 출처 키, 끊긴 갈래(to/next), initial에 없는 선수, us/them에 없는 타자, start 없음, 도달 불가 노드, 미검증 태그 수, NET_DEPTH(깊이·reply 배수), incoming 참조, 면 판정(tech 갈래마다 side, side.player = 갈래 샷의 타자).
// v1.2: 표시 이름(names) — 이름 있는 주제는 선수마다 이름이 있어야 하고, 화면 글(제목·설명·갈래·질문·화살표·대형·끝 문구)에 내부 약자(S·P·R·RP·F·B…)가 남아 있으면 문제.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const file = process.argv[2] || new URL("../../mobile/index.html", import.meta.url).pathname;
const html = readFileSync(file, "utf8");
const start = html.indexOf("const SOURCES");
const end = html.indexOf("// 뷰어");
if (start < 0 || end < 0) throw new Error("데이터 구간을 못 찾음");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(html.slice(start, end) + "\nthis.SOURCES = SOURCES; this.DATA = DATA; this.SPORTS = typeof SPORTS === \"undefined\" ? null : SPORTS; this.TIERS = typeof TIERS === \"undefined\" ? null : TIERS; this.NET_DEPTH = typeof NET_DEPTH === \"undefined\" ? null : NET_DEPTH; this.SIDE_MULT = typeof SIDE_MULT === \"undefined\" ? null : SIDE_MULT; this.BH_COURSE = typeof BH_COURSE === \"undefined\" ? null : BH_COURSE;", ctx);
const { SOURCES, DATA, SPORTS, TIERS, NET_DEPTH, SIDE_MULT, BH_COURSE } = ctx;

const problems = [];
// 포핸드/백핸드 표: SIDE_MULT[low|high][기술] = 급수 수만큼의 0 이상 숫자, BH_COURSE도 급수 수만큼
let sideNodes = 0, bhCourses = 0;
if (TIERS && SIDE_MULT) for (const kind of ["low", "high"]) for (const tech in SIDE_MULT[kind]) {
  const row = SIDE_MULT[kind][tech];
  if (!Array.isArray(row) || row.length !== TIERS.length || row.some((v) => typeof v !== "number" || v < 0)) problems.push(`SIDE_MULT.${kind}.${tech} 이상`);
}
if (TIERS && BH_COURSE && (BH_COURSE.length !== TIERS.length || BH_COURSE.some((v) => !(v > 0)))) problems.push("BH_COURSE 이상");
// 급수별 네트샷 깊이 표: 급수마다 depth>0·height·text와 reply(kill/net/lift, 0 이상; 0 = 잠금)가 있어야 한다
if (TIERS && NET_DEPTH) for (const tr of TIERS) {
  const d = NET_DEPTH[tr.id];
  if (!d || !(d.depth > 0) || !d.height || !d.text) { problems.push(`NET_DEPTH.${tr.id} 없음/이상`); continue; }
  for (const k of ["kill", "net", "lift"]) if (!d.reply || typeof d.reply[k] !== "number" || d.reply[k] < 0) problems.push(`NET_DEPTH.${tr.id}.reply.${k} 없음/이상`);
}
let nodes = 0, notes = 0, unverified = 0, namedTopics = 0;
for (const t of DATA.topics) {
  const ids = Object.keys(t.nodes);
  nodes += ids.length;
  const players = new Set([...t.us, ...t.them]);
  if (SPORTS && !SPORTS.some((sp) => sp.id === t.sport)) problems.push(`${t.id}: sport ${t.sport} 모름`);
  for (const id of players) if (!t.initial[id]) problems.push(`${t.id}: initial에 ${id} 없음`);
  // 표시 이름 검사(v1.2): 이름표가 있으면 선수 전원 이름이 있어야 하고, 화면 글에 약자가 남아 있으면 안 된다("B조"·"F-A" 같은 급수·갈래 이름은 제외).
  if (t.names) {
    namedTopics += 1;
    for (const id of players) if (!t.names[id]) problems.push(`${t.id}: names에 ${id} 없음`);
    const idRe = new RegExp("(?<![A-Za-z0-9_])(" + [...players].sort((a, b) => b.length - a.length).join("|") + ")(?![A-Za-z0-9_])(?!-[A-Z0-9])(?!조)");
    const check = (where, str) => { if (typeof str === "string" && idRe.test(str)) problems.push(`${t.id}/${where}: 화면 글에 약자 남음 — ${str.slice(0, 60)}`); };
    for (const id of Object.keys(t.nodes)) {
      const n = t.nodes[id];
      check(id + ".title", n.title); check(id + ".prompt", n.prompt); check(id + ".end", n.end);
      if (n.formation) { check(id + ".formation.us", n.formation.us); check(id + ".formation.them", n.formation.them); }
      if (n.arrow) check(id + ".arrow", n.arrow.text);
      (n.notes || []).forEach((nt, i) => check(id + "#" + i, nt.text));
      (n.branches || []).forEach((b) => check(id + "→" + b.to, b.label));
    }
  }
  if (!t.nodes[t.start]) problems.push(`${t.id}: start ${t.start} 없음`);
  const reach = new Set();
  const stack = [t.start];
  while (stack.length) {
    const id = stack.pop();
    if (reach.has(id) || !t.nodes[id]) continue;
    reach.add(id);
    const n = t.nodes[id];
    if (n.next) stack.push(n.next);
    (n.branches || []).forEach((b) => stack.push(b.to));
  }
  for (const id of ids) {
    const n = t.nodes[id];
    if (!reach.has(id)) problems.push(`${t.id}/${id}: 도달 불가`);
    if (n.next && !t.nodes[n.next]) problems.push(`${t.id}/${id}: next ${n.next} 없음`);
    (n.branches || []).forEach((b) => {
      if (!t.nodes[b.to]) problems.push(`${t.id}/${id}: 갈래 ${b.to} 없음`);
      if (b.w !== undefined && !(typeof b.w === "number" && b.w > 0)) problems.push(`${t.id}/${id}: 갈래 ${b.to} w 이상 ${b.w}`);
      if (b.skill !== undefined && ![-1, 0, 1].includes(b.skill)) problems.push(`${t.id}/${id}: 갈래 ${b.to} skill 이상 ${b.skill}`);
      if (!n.noProb && b.w === undefined) problems.push(`${t.id}/${id}: 갈래 ${b.to} 가중치 없음(noProb 아님)`);
    });
    if (n.branches && n.next) problems.push(`${t.id}/${id}: branches와 next 동시`);
    if (n.incoming && !(t.nodes[n.incoming] && t.nodes[n.incoming].shot)) problems.push(`${t.id}/${id}: incoming ${n.incoming} 없음/shot 없음`);
    if (n.side) { sideNodes += 1; if (!["포핸드", "백핸드"].includes(n.side.hand) || !["low", "high"].includes(n.side.kind) || !players.has(n.side.player)) problems.push(`${t.id}/${id}: side 이상 ${JSON.stringify(n.side)}`); }
    if (n.course) (n.branches || []).forEach((b) => { if (!(t.nodes[b.to] && t.nodes[b.to].shot)) problems.push(`${t.id}/${id}: 코스 갈래 ${b.to}에 shot 없음`); });
    (n.branches || []).forEach((b) => { if (b.oppSide) { bhCourses += 1; if (b.oppSide !== "백핸드" || !/백핸드\)$/.test(b.label)) problems.push(`${t.id}/${id}: 갈래 ${b.to} oppSide/라벨 이상`); } });
    if (n.incoming && t.nodes[n.incoming] && t.nodes[n.incoming].next !== id && !(t.nodes[n.incoming].branches || []).some((b) => b.to === id)) problems.push(`${t.id}/${id}: incoming ${n.incoming}이 이 노드로 이어지지 않음(next/branches)`);
    if ((n.branches || []).some((b) => b.tech) && !n.side) problems.push(`${t.id}/${id}: 갈래에 tech 있는데 side 없음`);
    if (n.side) (n.branches || []).forEach((b) => { const T = t.nodes[b.to]; if (T && T.shot && T.shot.by !== n.side.player) problems.push(`${t.id}/${id}: side.player ${n.side.player} ≠ 갈래 ${b.to} 타자 ${T.shot.by}`); });
    if (!n.next && !n.branches && !n.end) problems.push(`${t.id}/${id}: next/branches/end 없음`);
    for (const p in n.pos) if (!players.has(p)) problems.push(`${t.id}/${id}: pos에 모르는 선수 ${p}`);
    for (const p of players) if (!n.pos[p]) problems.push(`${t.id}/${id}: pos에 ${p} 없음`);
    if (n.shot && !players.has(n.shot.by)) problems.push(`${t.id}/${id}: shot.by ${n.shot.by} 모름`);
    if (n.shot && n.shot.from && n.pos[n.shot.by]) { /* from은 이전 노드 위치 기준이라 검사 안 함 */ }
    if (!n.formation || !n.formation.us || !n.formation.them) problems.push(`${t.id}/${id}: formation 없음`);
    (n.notes || []).forEach((nt, i) => {
      notes += 1;
      const keys = Array.isArray(nt.src) ? nt.src : [nt.src];
      if (!keys.length) problems.push(`${t.id}/${id}#${i}: src 없음`);
      keys.forEach((k) => { if (!SOURCES[k]) problems.push(`${t.id}/${id}#${i}: 출처 키 ${k} 없음`); if (k === "미") unverified += 1; });
      if (!nt.kind || !nt.text) problems.push(`${t.id}/${id}#${i}: kind/text 없음`);
    });
  }
}
console.log(`주제 ${DATA.topics.length}(이름표 ${namedTopics}), 노드 ${nodes}, 노트 ${notes}, 미검증 ${unverified}, 급수 ${TIERS ? TIERS.length : "-"}, 면 판정 노드 ${sideNodes}, 백핸드 코스 갈래 ${bhCourses}, 문제 ${problems.length}`);
problems.forEach((p) => console.log(" -", p));
process.exit(problems.length ? 1 : 0);
