import express from 'express';
const app = express();
const PORT = 3000;

// 기본 라우트
app.get("/", (req, res) => {
  res.send("Hello Sensitive Project!");
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
