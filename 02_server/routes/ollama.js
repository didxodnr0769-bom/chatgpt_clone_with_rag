const express = require("express");
const axios = require("axios");
const router = express.Router();

const OLLAMA_URL = "http://localhost:11434";
const SYSTEM_PROMPT =
  "당신은 도움이 되는 AI 어시스턴트입니다. 친절하고 정확한 답변을 제공해주세요.";

router.get("/models", async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// POST /api/chat

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
    const { model, messages, stream = false } = req.body;

    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    if (stream) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');

      const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model: model,
        messages: finalMessages,
        stream: true,
      }, {
        responseType: 'stream'
      });

      response.data.on('data', (chunk) => {
        res.write(chunk);
      });

      response.data.on('end', () => {
        res.end();
      });

      response.data.on('error', (error) => {
        console.error('Stream error:', error);
        res.status(500).end();
      });
    } else {
      const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model: model,
        messages: finalMessages,
        stream: false,
      });

      res.json(response.data);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to chat with model" });
  }
});
module.exports = router;
