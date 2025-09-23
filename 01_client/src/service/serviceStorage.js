import { localStorageUtils } from "@/lib/storage/LocalStorage";

/**
 * ChatHistory 객체 예시
 * {
 *   title: "채팅 제목",
 *   messages: [
 *     { role: "user", content: "사용자 메시지" },
 *     { role: "assistant", content: "응답 메시지" }
 *   ]
 * }
 */

export const serviceStorage = {
  // 전체 채팅 기록을 가져온다.
  getChatHistoryList() {
    const chatHistoryMap = localStorageUtils.getItem("chatHistoryMap");
    if (!chatHistoryMap) {
      return {};
    }
    return chatHistoryMap;
  },

  // 신규 채팅 기록을 저장한다.
  addChatHistory(chatId, chatHistory) {
    const chatHistoryMap = this.getChatHistoryList();
    chatHistoryMap[chatId] = chatHistory;
    localStorageUtils.setItem("chatHistoryMap", chatHistoryMap);
  },

  // 특정 채팅의 기록을 수정한다.
  updateChatHistory(chatId, chatHistory) {
    const chatHistoryMap = this.getChatHistoryList();
    chatHistoryMap[chatId] = chatHistory;
    localStorageUtils.setItem("chatHistoryMap", chatHistoryMap);
  },

  deleteChatHistory(chatId) {
    const chatHistoryMap = this.getChatHistoryList();
    delete chatHistoryMap[chatId];
    localStorageUtils.setItem("chatHistoryMap", chatHistoryMap);
  },

  // 시스템 프롬프트 배열을 저장한다.
  // prompts: Array<{ id: string, title: string, content: string, createdAt: string, updatedAt: string }>
  saveSystemPrompts(prompts) {
    localStorageUtils.setItem("systemPrompts", prompts);
  },

  // 시스템 프롬프트 배열을 가져온다.
  // 반환: Array<{ id: string, title: string, content: string, createdAt: string, updatedAt: string }>
  getSystemPrompts() {
    return localStorageUtils.getItem("systemPrompts") || [];
  },

  // 특정 시스템 프롬프트를 추가한다.
  addSystemPrompt(promptData) {
    const prompts = this.getSystemPrompts();
    const newPrompt = {
      id: Date.now().toString(),
      title: promptData.title,
      content: promptData.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prompts.push(newPrompt);
    this.saveSystemPrompts(prompts);
    return newPrompt;
  },

  // 특정 시스템 프롬프트를 수정한다.
  updateSystemPrompt(id, promptData) {
    const prompts = this.getSystemPrompts();
    const index = prompts.findIndex((p) => p.id === id);
    if (index !== -1) {
      prompts[index] = {
        ...prompts[index],
        title: promptData.title,
        content: promptData.content,
        updatedAt: new Date().toISOString(),
      };
      this.saveSystemPrompts(prompts);
      return prompts[index];
    }
    return null;
  },

  // 특정 시스템 프롬프트를 삭제한다.
  deleteSystemPrompt(id) {
    const prompts = this.getSystemPrompts();
    const filteredPrompts = prompts.filter((p) => p.id !== id);
    this.saveSystemPrompts(filteredPrompts);
    return filteredPrompts;
  },

  // 모든 시스템 프롬프트를 삭제한다.
  clearSystemPrompts() {
    localStorageUtils.removeItem("systemPrompts");
  },
};
