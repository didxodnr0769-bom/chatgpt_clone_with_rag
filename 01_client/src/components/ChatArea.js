import React, { useState, useRef, useEffect } from "react";
import { FiSend, FiSquare, FiCopy, FiCheck } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatService, chatUtils } from "@/service/serviceAPI";
import { serviceStorage } from "@/service/serviceStorage";
import CodeBlock from "./CodeBlock";
import "./ChatArea.css";
import "./CodeBlock.css";

const ChatArea = (props) => {
  const {
    selectedModel,
    onConversationSaved,
    selectedConversation,
    systemPrompts,
  } = props;
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isFirstResponse, setIsFirstResponse] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isUserStoppedRef = useRef(false);

  // 새 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    chatUtils.scrollToBottom(messagesEndRef);
  }, [chatHistory]);

  // 선택된 대화가 변경될 때 대화 내용 로드 또는 새 채팅 시작
  useEffect(() => {
    if (selectedConversation) {
      loadConversation(selectedConversation);
    } else {
      // 새 채팅 시작 시 상태 초기화
      startNewChat();
    }
  }, [selectedConversation]);

  // 고유한 채팅 ID 생성
  const generateChatId = () => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 선택된 대화 내용을 불러오는 함수
  const loadConversation = (conversation) => {
    if (!conversation || !conversation.messages) return;

    // 대화 내용 로드
    setChatHistory(conversation.messages);
    setCurrentChatId(conversation.id);
    setIsFirstResponse(false); // 기존 대화이므로 첫 응답이 아님

    console.log("대화를 불러왔습니다:", conversation);
  };

  // 새 채팅 시작 함수
  const startNewChat = () => {
    // 채팅 히스토리 초기화
    setChatHistory([]);
    setCurrentChatId(null);
    setIsFirstResponse(true);
    setStreamingMessage("");
    setIsStreaming(false);
    setIsLoading(false);

    // 진행 중인 스트리밍이 있다면 중단
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    console.log("새 채팅이 시작되었습니다.");
  };

  // 메시지 복사 함수
  const copyMessageToClipboard = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);

      // 2초 후 복사 완료 표시 제거
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);

      console.log("메시지가 클립보드에 복사되었습니다.");
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
      // 폴백: 구식 방식으로 복사
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    }
  };

  // 첫 번째 사용자 메시지를 기반으로 제목 생성
  const generateChatTitle = (firstMessage) => {
    const maxLength = 50;
    if (firstMessage.length <= maxLength) {
      return firstMessage;
    }
    return firstMessage.substring(0, maxLength).trim() + "...";
  };

  // 대화를 스토리지에 저장
  const saveChatToStorage = (chatId, title, messages) => {
    // 기존 대화 데이터 가져오기 (있는 경우)
    const existingChatMap = serviceStorage.getChatHistoryList();
    const existingChat = existingChatMap[chatId];

    const chatData = {
      id: chatId,
      title: title,
      messages: messages,
      model: selectedModel,
      createdAt: existingChat?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    serviceStorage.addChatHistory(chatId, chatData);
    console.log("대화가 저장되었습니다:", chatData);

    // 첫 대화일 때만 부모 컴포넌트에 저장 완료 알림
    if (onConversationSaved && !existingChat) {
      onConversationSaved(chatData);
    }
  };

  // 스트리밍 정지 함수
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      isUserStoppedRef.current = true; // 사용자가 의도적으로 정지했음을 표시
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);

      // 현재까지 받은 스트리밍 메시지가 있으면 채팅 히스토리에 추가
      if (streamingMessage.trim()) {
        const finalMessage = chatService.createAIMessage(streamingMessage);
        const updatedHistory = [...chatHistory, finalMessage];
        setChatHistory(updatedHistory);

        // 첫 번째 응답이면 대화를 스토리지에 저장
        if (isFirstResponse && currentChatId) {
          // 첫 번째 사용자 메시지를 찾아서 제목 생성
          const firstUserMessage = chatHistory.find(
            (msg) => msg.sender === "user"
          );
          if (firstUserMessage) {
            const chatTitle = generateChatTitle(firstUserMessage.text);
            saveChatToStorage(currentChatId, chatTitle, updatedHistory);
            setIsFirstResponse(false);
          }
        } else if (currentChatId) {
          // 기존 대화에 새 메시지 추가 시에도 업데이트
          const existingChatMap = serviceStorage.getChatHistoryList();
          const existingChat = existingChatMap[currentChatId];
          if (existingChat) {
            saveChatToStorage(
              currentChatId,
              existingChat.title,
              updatedHistory
            );
          }
        }
      }
      setStreamingMessage("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (chatUtils.isMessageSending(isLoading, message)) return;

    const userMessage = chatService.createUserMessage(message);
    const currentUserMessage = message;

    // 첫 번째 메시지이면 채팅 ID 생성
    let chatId = currentChatId;
    if (!chatId) {
      chatId = generateChatId();
      setCurrentChatId(chatId);
    }

    setChatHistory((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);
    setIsStreaming(false);
    setStreamingMessage("");

    // AbortController 생성 및 플래그 초기화
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    isUserStoppedRef.current = false;

    let chunkMessage = "";
    try {
      // 스트림 응답 처리 (시스템 프롬프트 포함)
      const result = await chatService.sendMessageStream(
        chatHistory,
        userMessage,
        selectedModel,
        (chunk) => {
          // 스트림 데이터를 받을 때마다 UI 업데이트
          if (chunk) {
            setIsStreaming(true);
            setStreamingMessage((prev) => prev + chunk);
            chunkMessage += chunk;
          }
        },
        abortController,
        systemPrompts
      );

      if (result.success) {
        // 스트림이 완료되면 최종 메시지를 채팅 히스토리에 추가
        const finalMessage = chatService.createAIMessage(chunkMessage);

        console.log("finalMessage", chunkMessage, finalMessage);
        const updatedHistory = [...chatHistory, userMessage, finalMessage];
        setChatHistory(updatedHistory);

        // 첫 번째 응답이 완료되면 대화를 스토리지에 저장
        if (isFirstResponse) {
          const chatTitle = generateChatTitle(currentUserMessage);
          saveChatToStorage(chatId, chatTitle, updatedHistory);
          setIsFirstResponse(false);
        } else {
          // 기존 대화에 새 메시지 추가 시에도 업데이트
          const existingChatMap = serviceStorage.getChatHistoryList();
          const existingChat = existingChatMap[chatId];
          if (existingChat) {
            saveChatToStorage(chatId, existingChat.title, updatedHistory);
          }
        }
      } else {
        // 에러 발생 시 에러 메시지 추가
        setChatHistory((prev) => [...prev, result.message]);
      }
    } catch (error) {
      console.error("메시지 전송 오류:", error);

      // 사용자가 의도적으로 정지한 경우가 아닌 경우에만 에러 메시지 표시
      if (!isUserStoppedRef.current) {
        const errorMessage = chatService.createErrorMessage(error);
        setChatHistory((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage("");
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="chat-area">
      <div className="chat-container">
        {/* 채팅 메시지들 */}
        <div className="messages-container">
          {chatHistory.length === 0 ? (
            <div className="welcome-message">
              <h1>오늘은 무슨 생각을 하고 계신가요?</h1>
            </div>
          ) : (
            chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`message ${
                  msg.sender === "user" ? "user-message" : "ai-message"
                }`}
              >
                <div className="message-content">
                  {msg.sender === "user" ? (
                    <p>{msg.text}</p>
                  ) : (
                    <div className="ai-message-container">
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // 코드 블록 스타일링
                            code({
                              node,
                              inline,
                              className,
                              children,
                              ...props
                            }) {
                              const match = /language-(\w+)/.exec(
                                className || ""
                              );
                              return !inline && match ? (
                                <CodeBlock className={className} {...props}>
                                  {children}
                                </CodeBlock>
                              ) : (
                                <code className="inline-code" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            // 링크 스타일링
                            a: ({ node, children, href, ...props }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="markdown-link"
                                {...props}
                              >
                                {children}
                              </a>
                            ),
                            // 테이블 스타일링
                            table: ({ node, children, ...props }) => (
                              <div className="table-container">
                                <table className="markdown-table" {...props}>
                                  {children}
                                </table>
                              </div>
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                      <button
                        className={`copy-button ${
                          copiedMessageId === msg.id ? "copied" : ""
                        }`}
                        onClick={() => copyMessageToClipboard(msg.text, msg.id)}
                        title="응답 복사"
                      >
                        {copiedMessageId === msg.id ? (
                          <FiCheck size={16} />
                        ) : (
                          <FiCopy size={16} />
                        )}
                      </button>
                    </div>
                  )}
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              </div>
            ))
          )}

          {/* 스트리밍 메시지 표시 */}
          {isLoading && streamingMessage && (
            <div className="message ai-message">
              <div className="message-content streaming">
                <div className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <CodeBlock className={className} {...props}>
                            {children}
                          </CodeBlock>
                        ) : (
                          <code className="inline-code" {...props}>
                            {children}
                          </code>
                        );
                      },
                      a: ({ node, children, href, ...props }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="markdown-link"
                          {...props}
                        >
                          {children}
                        </a>
                      ),
                      table: ({ node, children, ...props }) => (
                        <div className="table-container">
                          <table className="markdown-table" {...props}>
                            {children}
                          </table>
                        </div>
                      ),
                    }}
                  >
                    {streamingMessage}
                  </ReactMarkdown>
                </div>
                <span className="message-time">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          {/* 로딩 인디케이터 (스트리밍이 시작되지 않았을 때만 표시) */}
          {isLoading && !streamingMessage && (
            <div className="message ai-message">
              <div className="message-content">
                <div className="loading-indicator">
                  <span>AI가 응답을 생성하고 있습니다...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 하단 면책 조항 */}
        <div className="disclaimer">
          <p>AI는 실수를 할 수 있습니다. 중요한 정보는 재차 확인하세요.</p>
        </div>
      </div>

      {/* 하단 고정 채팅 입력창 */}
      <div className="chat-input-container fixed">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <div className="chat-input-wrapper">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="무엇이든 물어보세요"
              className="chat-input"
              disabled={isLoading}
            />

            <div className="input-actions">
              {isStreaming ? (
                <button
                  type="button"
                  className="stop-button"
                  onClick={handleStopStreaming}
                  title="스트리밍 정지"
                >
                  <FiSquare size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="send-button"
                  disabled={chatUtils.isMessageSending(isLoading, message)}
                >
                  <FiSend size={16} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
