const express = require("express");
const axios = require("axios");
const RAGService = require("../services/ragService");
const router = express.Router();

const OLLAMA_URL = "http://localhost:11434";
const SYSTEM_PROMPT =
  "당신은 도움이 되는 AI 어시스턴트입니다. 친절하고 정확한 답변을 제공해주세요.";

const ragService = new RAGService();

router.get("/models", async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// POST /api/chat - RAG 기능이 통합된 채팅 엔드포인트

/**
 *
 curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-ko-Q2:latest",
    "messages": [
      { "role": "user", "content": "안녕하세요" }
    ]
  }'
 */
router.post("/chat", async (req, res) => {
  try {
    const { model = "qwen-ko-Q2:latest", messages, stream = false } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // 마지막 사용자 메시지 추출
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();

    if (!lastUserMessage) {
      return res.status(400).json({ error: "User message is required" });
    }

    // RAG 서비스를 통해 컨텍스트와 함께 메시지 생성
    const ragResponse = await ragService.generateContextualResponse(
      lastUserMessage.content,
      model
    );

    if (stream) {
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");

      const response = await axios.post(
        `${OLLAMA_URL}/api/chat`,
        {
          model: model,
          messages: ragResponse.messages,
          stream: true,
        },
        {
          responseType: "stream",
        }
      );

      response.data.on("data", (chunk) => {
        res.write(chunk);
      });

      response.data.on("end", () => {
        res.end();
      });

      response.data.on("error", (error) => {
        console.error("Stream error:", error);
        res.status(500).end();
      });
    } else {
      const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model: model,
        messages: ragResponse.messages,
        stream: false,
      });

      res.json({
        ...response.data,
        relevantDocs: ragResponse.relevantDocs,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to chat with model" });
  }
});

// RAG 검색 및 채팅 엔드포인트
router.post("/rag/search", async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const results = await ragService.search(query, topK);
    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to search documents" });
  }
});

router.post("/rag/chat", async (req, res) => {
  try {
    const { query, model = "qwen-ko-Q2:latest", stream = false } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const ragResponse = await ragService.generateContextualResponse(
      query,
      model
    );

    if (stream) {
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");

      const response = await axios.post(
        `${OLLAMA_URL}/api/chat`,
        {
          model: model,
          messages: ragResponse.messages,
          stream: true,
        },
        {
          responseType: "stream",
        }
      );

      response.data.on("data", (chunk) => {
        res.write(chunk);
      });

      response.data.on("end", () => {
        res.end();
      });

      response.data.on("error", (error) => {
        console.error("Stream error:", error);
        res.status(500).end();
      });
    } else {
      const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model: model,
        messages: ragResponse.messages,
        stream: false,
      });

      res.json({
        ...response.data,
        relevantDocs: ragResponse.relevantDocs,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate RAG response" });
  }
});

router.get("/rag/stats", async (req, res) => {
  try {
    const stats = ragService.getStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

module.exports = router;
