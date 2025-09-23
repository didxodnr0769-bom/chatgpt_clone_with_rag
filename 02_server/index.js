const express = require("express");
const cors = require("cors");
const StartupEmbeddingService = require("./services/startupEmbeddingService");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// const testRoutes = require("./routes/test");
const ollamaRoutes = require("./routes/ollama");

app.use("/api", ollamaRoutes);
// app.use("/api", testRoutes);

// 서버 시작 시 임베딩 초기화
async function startServer() {
  try {
    const embeddingService = new StartupEmbeddingService();
    await embeddingService.initializeEmbeddings();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize embeddings:', error);
    console.log('Starting server without embeddings...');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
}

startServer();
