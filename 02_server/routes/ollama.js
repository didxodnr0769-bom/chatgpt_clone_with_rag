const express = require("express");
const axios = require("axios");
const RAGService = require("../services/ragService");
const router = express.Router();

const OLLAMA_URL = "http://localhost:11434";
const SYSTEM_PROMPT = `
  당신은 "모바일 매니저"라는 서비스의 어시스턴트 AI 챗봇입니다. 
  사용자의 물음에 문서를 기반으로 참고하여 답변하세요.  
  문서를 기반으로 사용자의 물음에 가장 합리적인 대답을 추론하세요.
  반드시 대답은 한국말로 대답해야합니다.  
`;

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
    const { model = "qwen-ko-Q2:latest", messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // 마지막 사용자 메시지 추출
    const lastUserMessage = messages.filter((msg) => msg.role === "user").pop();

    if (!lastUserMessage) {
      return res.status(400).json({ error: "User message is required" });
    }
    console.log(lastUserMessage);

    // RAG 서비스를 통해 컨텍스트와 함께 메시지 생성
    const ragResponse = await ragService.generateContextualResponse(
      lastUserMessage.content,
      model,
      SYSTEM_PROMPT
    );

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");

    // RAG 소스 정보를 먼저 전송
    res.write(
      JSON.stringify({
        type: "rag_sources",
        relevantDocs: ragResponse.relevantDocs,
      }) + "\n"
    );

    const response = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: model,
        messages: ragResponse.messages,
        stream: true,
        options: {
          temperature: 0.2,
          top_k: 40,
          top_p: 0.9,
          num_ctx: 4096,
          repeat_penalty: 1.1,
        },
      },
      {
        responseType: "stream",
      }
    );

    response.data.on("data", (chunk) => {
      // 각 청크에 type을 추가하여 구분
      try {
        const data = JSON.parse(chunk.toString());
        const wrappedData = {
          type: "chat_response",
          ...data,
        };
        res.write(JSON.stringify(wrappedData) + "\n");
      } catch (error) {
        // JSON 파싱 실패 시 원본 청크 전송
        res.write(chunk);
      }
    });

    response.data.on("end", () => {
      res.end();
    });

    response.data.on("error", (error) => {
      console.error("Stream error:", error);
      res.status(500).end();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to chat with model" });
  }
});

module.exports = router;
