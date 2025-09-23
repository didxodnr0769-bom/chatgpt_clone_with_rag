// 이 코드를 index.js 파일 최상단에 추가하세요.
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥💥💥 잡히지 않은 에러 발생! 💥💥💥");
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

const express = require("express");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ message: "Test endpoint working!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
