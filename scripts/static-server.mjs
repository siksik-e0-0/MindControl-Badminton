// Range 요청(HTTP 206)을 지원하는 정적 서버 — iOS Safari는 영상 재생에 byte-range가 필요해 python http.server(200만 줌)로는 안 된다.
// 사용: node scripts/static-server.mjs <디렉터리> [포트=8088]  (0.0.0.0에 묶는다)
// v2.4.1(리뷰어 지적 wgr_f241836c509c1fce7a7b225e): 잘못된 URL 인코딩(/% 등)의 URIError가 처리되지 않아 프로세스가 죽었다.
// 요청마다 try/catch로 400(URIError)/500을 돌려주고, 파일 스트림 오류도 잡아 서버가 계속 살아 있게 한다. 루트 경계는 "루트/" 접두로 비교(형제 디렉터리 이름 겹침 방지).
import { createServer } from "node:http";
import { statSync, createReadStream, existsSync } from "node:fs";
import { join, normalize, extname } from "node:path";
const root = process.argv[2] || ".", port = Number(process.argv[3] || 8088);
const MIME = { ".html": "text/html; charset=utf-8", ".mp4": "video/mp4", ".mov": "video/quicktime", ".jpg": "image/jpeg", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp" };
const rootNorm = normalize(root).replace(/\\/g, "/").replace(/\/$/, "");
function serve(req, res) {
  const url = decodeURIComponent(req.url.split("?")[0]); // 잘못된 인코딩이면 URIError → 아래 catch에서 400
  let path = normalize(join(root, url)).replace(/\\/g, "/");
  if (path !== rootNorm && !path.startsWith(rootNorm + "/")) { res.writeHead(403); return res.end(); }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) { res.writeHead(404); return res.end("not found"); }
  const size = statSync(path).size, type = MIME[extname(path).toLowerCase()] || "application/octet-stream";
  const head = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" };
  const send = (stream) => stream.on("error", (e) => { console.error("stream", path, e.message); res.destroy(); }).pipe(res);
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range) {
    const start = range[1] === "" ? Math.max(0, size - Number(range[2])) : Number(range[1]);
    const end = range[1] !== "" && range[2] !== "" ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) { res.writeHead(416, { "Content-Range": "bytes */" + size }); return res.end(); }
    res.writeHead(206, Object.assign(head, { "Content-Range": "bytes " + start + "-" + end + "/" + size, "Content-Length": end - start + 1 }));
    if (req.method === "HEAD") return res.end();
    return send(createReadStream(path, { start, end }));
  }
  res.writeHead(200, Object.assign(head, { "Content-Length": size }));
  if (req.method === "HEAD") return res.end();
  send(createReadStream(path));
}
createServer((req, res) => {
  try { serve(req, res); }
  catch (e) {
    const bad = e instanceof URIError;
    console.error(bad ? "bad url" : "error", req.url, e.message);
    if (!res.headersSent) res.writeHead(bad ? 400 : 500, { "Content-Type": "text/plain" });
    res.end(bad ? "bad url" : "server error");
  }
}).listen(port, "0.0.0.0", () => console.log("static-server", root, "0.0.0.0:" + port));
