// 화면단에서 사용할 서비스 API 모음
import { ollamaApiService, ollamaUtils } from "@/lib/axios/axios";

// 채팅 관련 서비스
export const chatService = {
  // 메시지 형식 변환 (화면단 -> API 형식)
  formatMessagesForAPI(chatHistory, systemPrompts = []) {
    const messages = [];

    // 시스템 프롬프트가 있으면 맨 앞에 추가
    if (systemPrompts && systemPrompts.length > 0) {
      // 여러 시스템 프롬프트를 하나로 합치기
      const combinedSystemPrompt = systemPrompts
        .map((prompt) => `[${prompt.title}]\n${prompt.content}`)
        .join("\n\n");

      messages.push({
        role: "system",
        content: combinedSystemPrompt,
      });
    }

    // 기존 채팅 히스토리 추가
    const chatMessages = chatHistory
      .filter((msg) => msg.sender === "user" || msg.sender === "ai")
      .map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      }));

    messages.push(...chatMessages);
    return messages;
  },

  // 새 메시지 생성
  createMessage(text, sender, timestamp = null) {
    return {
      id: Date.now() + Math.random(),
      text,
      sender,
      timestamp: timestamp || new Date().toLocaleTimeString(),
    };
  },

  // 사용자 메시지 생성
  createUserMessage(text) {
    return this.createMessage(text, "user");
  },

  // AI 메시지 생성
  createAIMessage(text) {
    return this.createMessage(text, "ai");
  },

  // 에러 메시지 생성
  createErrorMessage(error) {
    return this.createMessage(ollamaUtils.handleError(error), "ai");
  },

  // 스트림 채팅 완료 요청
  async sendMessageStream(
    chatHistory,
    userMessage,
    model = "llama3.1:8b",
    onChunk,
    abortController = null,
    systemPrompts = []
  ) {
    try {
      // API 형식으로 메시지 변환 (시스템 프롬프트 포함)
      const apiMessages = this.formatMessagesForAPI(chatHistory, systemPrompts);

      // 현재 사용자 메시지 추가
      apiMessages.push({
        role: "user",
        content: userMessage.text,
      });

      // 스트림 API 호출
      await ollamaApiService.chatCompletionStream(
        apiMessages,
        model,
        ollamaUtils.getDefaultChatOptions(),
        onChunk,
        abortController
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error("스트림 채팅 API 호출 오류:", error);
      return {
        success: false,
        message: this.createErrorMessage(error),
      };
    }
  },
};

// 모델 관련 서비스
export const modelService = {
  // 사용 가능한 모델 목록 조회
  async getAvailableModels() {
    try {
      const response = await ollamaApiService.listModels();
      return {
        success: true,
        models: response.models || [],
      };
    } catch (error) {
      console.error("모델 목록 조회 오류:", error);
      return {
        success: false,
        error: ollamaUtils.handleError(error),
      };
    }
  },
};

// 대화 관리 서비스
export const conversationService = {
  // 새 대화 시작
  createNewConversation(title = "새 대화") {
    return {
      id: Date.now() + Math.random(),
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  // 대화에 메시지 추가
  addMessageToConversation(conversation, message) {
    return {
      ...conversation,
      messages: [...conversation.messages, message],
      updatedAt: new Date().toISOString(),
    };
  },

  // 대화 제목 업데이트 (첫 번째 사용자 메시지로)
  updateConversationTitle(conversation, firstUserMessage) {
    const title =
      firstUserMessage.text.length > 30
        ? firstUserMessage.text.substring(0, 30) + "..."
        : firstUserMessage.text;

    return {
      ...conversation,
      title,
    };
  },
};

// 유틸리티 함수들
export const chatUtils = {
  // 메시지 검증
  validateMessage(message) {
    return message && message.trim().length > 0;
  },

  // 로딩 상태 확인
  isMessageSending(isLoading, message) {
    return isLoading || !this.validateMessage(message);
  },

  // 스크롤 위치 조정
  scrollToBottom(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  },
};
