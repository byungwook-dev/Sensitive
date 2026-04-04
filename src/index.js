import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// React 빌드 결과물 서빙
app.use(express.static(path.join(__dirname, "build")));

// 기본 라우트
app.get("/", (req, res) => {
  res.send("Hello Sensitive Project!");
});

// React 라우팅 지원
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
