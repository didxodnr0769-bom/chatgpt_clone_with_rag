import React, { useState } from "react";

const TestPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 간단한 채팅 API 호출 함수
  const sendMessage = async (message) => {
    setIsLoading(true);
    setError(null);

    try {
      // 실제 Ollama API 호출 (임시로 모킹)
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3.1:8b",
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content || "응답을 받지 못했습니다.";
    } catch (error) {
      console.error("채팅 요청 오류:", error);
      throw new Error(
        "Ollama 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");

    // 사용자 메시지 추가
    const newUserMessage = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    try {
      // AI 응답 요청
      const aiResponse = await sendMessage(userMessage);

      // AI 응답 추가
      const newAiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, newAiMessage]);
    } catch (error) {
      setError(error.message);

      // 에러 메시지 추가
      const errorMessage = {
        id: Date.now() + 1,
        role: "error",
        content: error.message,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="test-page">
      <div className="test-header">
        <h1>Ollama 채팅 테스트</h1>
        <button onClick={clearChat} className="clear-btn">
          대화 초기화
        </button>
      </div>

      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>메시지를 보내서 대화를 시작하세요!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role} ${
                  message.role === "error" ? "error" : ""
                }`}
              >
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">{message.timestamp}</div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content">
                <div className="loading-indicator">
                  <span>AI가 응답을 생성하고 있습니다...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
              disabled={isLoading}
              rows={3}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-btn"
            >
              {isLoading ? "전송 중..." : "전송"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>오류: {error}</p>
          <button onClick={() => setError(null)}>닫기</button>
        </div>
      )}

      <div className="test-info">
        <h3>테스트 정보</h3>
        <ul>
          <li>Ollama 서버가 localhost:11434에서 실행 중이어야 합니다.</li>
          <li>llama2 모델이 설치되어 있어야 합니다.</li>
          <li>CORS 설정이 필요할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default TestPage;
